// Detecter l'état de visibilité de la page
import * as Redux from 'redux';
import { BackendStatus } from './BackendStore';
import * as Actions from './Actions';
import * as BackendStore from './BackendStore';
import CancellationToken from "cancellationtoken";
import * as Store from './Store';

class Request {
    readonly notifier: Notifier;
    readonly requestData: any;
    readonly requestId: number;
    readonly type: string;
    uid: string | undefined;
    canceled: boolean;
    readonly resolve: (e: any) => void;
    readonly reject: (err: any) => void;

    constructor(notifier: Notifier, requestData: any, requestId: number, resolve: (e:any)=>(void), reject:(err:any)=>(void), type?: string) {
        this.notifier = notifier;
        this.type = type || "startRequest";
        this.requestData = requestData;
        this.requestId = requestId;

        // Callback for done, onError, onCancel...
        this.resolve = resolve;
        this.reject = reject;

        // Set when first send
        this.uid = undefined;

        // cancel was called on client side ?
        this.canceled = false;
    }

    setClientId(clientId:string) {
        this.uid = clientId + ':' + this.requestId;
    }

    wasSent() {
        return this.uid !== undefined;
    }
}

export default class Notifier {
    private connectionId: number;
    private sendingQueueMaxSize: number;
    private suspended: boolean;
    private uniqRequestId: number;
    private clientId: string|undefined;
    private serverId: string|undefined;
    private socket: WebSocket|undefined;
    private url: string|undefined;
    private toSendRequests: Request[];
    private toCancelRequests: Request[];
    private activeRequests: {[id:string]:Request};
    private resendTimer: number|undefined;
    private store: Redux.Store<Store.Content>;
    private handshakeOk: boolean|undefined;

    private readonly hidden: string;
    private readonly visibilityChange: string;
    private pendingMessageCount: number;
    private pendingUpdateAsk: {};
    private hidingTimeout: number | undefined;
    // FIXME: not used
    private xmitTimeout: number | undefined;

    constructor() {
        this.socket = undefined;
        this.connectionId = 0;
        this.sendingQueueMaxSize = 1000;
        this.resetHandshakeStatus(false);

        this.suspended = true;
        this.url = undefined;

        // Request to server are emited with this id
        this.uniqRequestId = 0;

        // The server send that id on each connection.
        // Request are sent using uid: clientId:uniqRequestId
        this.clientId = undefined;


        // Received on welcome. Used to detect server restarts.
        this.serverId = undefined;

        // uniqRequestId => Request objects
        this.toSendRequests = [];
        this.toCancelRequests = [];
        this.activeRequests = {};

        this.resendTimer = undefined;

        if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
            this.hidden = "hidden";
            this.visibilityChange = "visibilitychange";
        } else if (typeof (document as any).msHidden !== "undefined") {
            this.hidden = "msHidden";
            this.visibilityChange = "msvisibilitychange";
        } else if (typeof (document as any).webkitHidden !== "undefined") {
            this.hidden = "webkitHidden";
            this.visibilityChange = "webkitvisibilitychange";
        }
        console.log('hidden property: ' + this.hidden);
        document.addEventListener(this.visibilityChange, this.handleVisibilityChange.bind(this), false);
    }

    public attachToStore(store: Redux.Store<Store.Content>) {
        console.log('Websocket: attached to store');
        this.store = store;
        this.dispatchBackendStatus();
    }

    private dispatchBackendStatus(error?: string|null)
    {
        if (this.store == undefined) return;

        if (error !== undefined && error !== null) {
            Actions.dispatch<BackendStore.Actions>(this.store)("backendStatus", {
                backendStatus: BackendStatus.Failed,
                backendError: error
            });
            return;
        }
        if (this.handshakeOk) {
            Actions.dispatch<BackendStore.Actions>(this.store)("backendStatus", {
                backendStatus: BackendStatus.Connected,
                backendError: undefined
            });
            return;
        }
        if (this.socket == null) {
            // On est caché: on est en pause
            if (document[this.hidden]) {
                Actions.dispatch<BackendStore.Actions>(this.store)("backendStatus", {
                    backendStatus: BackendStatus.Paused,
                    backendError: undefined
                });
                return;
            }
            // On devrait etre connecté
            Actions.dispatch<BackendStore.Actions>(this.store)("backendStatus", {
                    backendStatus: BackendStatus.Failed
            });
            return;
        } else {
            Actions.dispatch<BackendStore.Actions>(this.store)("backendStatus", {
                backendStatus: BackendStatus.Connecting,
                backendError: undefined
            });
        }

    }

    private resetHandshakeStatus(status:boolean, clientId?:string)
    {
        this.handshakeOk = status;
        this.pendingUpdateAsk = {};
        this.pendingMessageCount = 0;
        if (status) {
            this.connectionId++;
            this.clientId = clientId;
        }
        this.clearXmitTimeout();
    }

    private sendingQueueReady() {
        return this.handshakeOk &&
            this.socket!.bufferedAmount < this.sendingQueueMaxSize;
    }

    private sendAsap() {
        if (this.resendTimer != undefined) {
            window.clearTimeout(this.resendTimer);
            this.resendTimer = undefined;
        }

        let sthSent = false;
        while((this.toSendRequests.length || this.toCancelRequests.length) && this.sendingQueueReady()) {
            sthSent = true;
            if (this.toCancelRequests.length) {
                const toCancel = this.toCancelRequests.splice(0, 1)[0];
                this.write({
                    'type': 'cancelRequest',
                    'uid': toCancel.uid
                });
            } else {
                const toSend = this.toSendRequests.splice(0, 1)[0];
                toSend.setClientId(this.clientId!);
                this.activeRequests[toSend.uid!] = toSend;
                this.write({
                    'type': toSend.type,
                    id: toSend.requestId,
                    details: toSend.requestData
                });
            }
        }
        // Add a timer to restart asap
        // FIXME: would prefer a notification from websocket !
        if (this.toSendRequests.length || this.toCancelRequests.length) {
            this.resendTimer = window.setTimeout(()=>{
                this.resendTimer = undefined;
                this.sendAsap();
            }, 100);
        }
   }


    // Returns a promise that will execute the request
    // Except an object with at least target and method property set
    // will call an API method on server side
    // FIXME: make this cancelable
    public sendRequest<Q,R>(content:Q, type?: string):Promise<R> {
        return new Promise<R>((resolve, reject) => {
            if (!this.handshakeOk) {
                throw "Backend not connected";
            }
            const request = new Request(this, {... content}, this.uniqRequestId++, resolve, reject, type);
            this.toSendRequests.push(request);
            this.sendAsap();
        });
    }

    // Called on reconnection when backend was restarted.
    // abort all pending requests
    private failStartedRequests(error:any) {
        const toDrop = Object.keys(this.activeRequests);
        for(let i = 0; i < toDrop.length; ++i) {
            const uid = toDrop[i];
            if (!Object.prototype.hasOwnProperty.call(this.activeRequests, uid)) continue;
            const request = this.activeRequests[uid];
            delete this.activeRequests[uid];

            for(let j = 0 ; this.toCancelRequests.length;) {
                if (this.toCancelRequests[j] === request) {
                    this.toCancelRequests.splice(j, 1);
                } else {
                    j++;
                }
            }

            try {
                request.reject(error);
            } catch(e) {
                console.error('onCancel error', e.stack || e);
            }
        }
    }

    private write(obj:any)
    {
        try {
            this.socket!.send(JSON.stringify(obj));
        } catch(e) {
            console.log('Websocket: write failed: ' + e);
            this._close();
            this.dispatchBackendStatus();
        }
    }

    private clearXmitTimeout() {
        if (this.xmitTimeout != undefined) {
            window.clearTimeout(this.xmitTimeout);
            this.xmitTimeout = undefined;
        }
    }

    private cancelHidingTimeout() {
        if (this.hidingTimeout != undefined) {
            window.clearTimeout(this.hidingTimeout);
            this.hidingTimeout = undefined;
        }
    }

    handleVisibilityChange() {
        if (document[this.hidden]) {
            console.log('Websocket: Became hidden');
            this.cancelHidingTimeout();
            this.hidingTimeout = window.setTimeout(()=>{
                console.log('Websocket: Hiding timeout expired');
                this.hidingTimeout = undefined;
                this.updateState();
            }, 10000);
        } else {
            console.log('Websocket: Became visible');
            this.cancelHidingTimeout();
            this.updateState();
        }
    }

    public connect(apiRoot:string) {
        let webSocketRoot = apiRoot + "notifications";
        webSocketRoot = "ws" + webSocketRoot.substr(4);
        this.url = webSocketRoot;

        this.updateState();
    }

    private updateState()
    {
        const wantedConn = !document[this.hidden];
        if (wantedConn) {
            if (!this.socket) {
                // FIXME: delay ?
                console.log('Websocket: restart needed');
                this._open();
            }
        } else {
            if (this.socket) {
                console.log('Websocket: close required');
                this._close();
                this.dispatchBackendStatus();
            }
        }
    }

    private _open() {
        console.log('Websocket: connecting to ' + this.url);
        this.resetHandshakeStatus(false);
        try {
            this.socket = new WebSocket(this.url!);
            this.dispatchBackendStatus();
        } catch(e) {
            console.log('Websocket: failed to open: ' + e);
            this.socket = undefined;
            this.dispatchBackendStatus('' + e);
        }

        let notifications:any[] = [];
        let flushTimeout: number|undefined = undefined;

        const flushNotifications=()=>{
            if (flushTimeout !== undefined) {
                clearTimeout(flushTimeout);
                flushTimeout = undefined;
            }
            if (notifications.length) {
                const toSend = notifications;
                notifications = [];
                // console.log('batching notifications: ', toSend.length);
                this.store.dispatch({type: "notification", batch: toSend});
            }
        }

        const pushNotification=(diff:any)=>{
            notifications.push(diff);
            if (flushTimeout === undefined) {
                flushTimeout = window.setTimeout(()=> {
                    flushTimeout = undefined;
                    flushNotifications();
                }, 40);
            }
        }

        if (this.socket) {
            this.socket.onopen = (data)=>{
                console.log('Websocket: connected');
            };
            this.socket.onmessage = (event)=>{
                const data = JSON.parse(event.data);
                if (data.type == 'welcome') {
                    console.log('Websocket: welcomed', data);
                    this.resetHandshakeStatus(true, data.clientId);
                    this.serverId = data.serverId;

                    this.store.dispatch({type: 'notification', data: data.data});
                }


                if (data.type == 'requestEnd') {
                    flushNotifications();
                    const uid = data.uid;
                    if (Object.prototype.hasOwnProperty.call(this.activeRequests, uid)) {
                        const request = this.activeRequests[uid];
                        delete(this.activeRequests[uid]);
                        this.toCancelRequests = this.toCancelRequests.filter((item)=>{item.uid != uid});
                        console.log('Request status is ' + data.status);
                        try {
                            switch(data.status) {
                                case 'done':
                                    request.resolve(data.result);
                                    break;
                                case 'canceled':
                                    request.reject(new Error("Canceled on server side"));
                                    break;
                                default:
                                    request.reject(data.message);
                                    break;
                            }
                        } catch(e) {
                            console.log('Request end failed', e);
                        }
                    } else {
                        console.log('Request not found: ' + uid);
                    }
                }

                if (data.type=="update") {
                    pushNotification(data.diff);
                }
            };
            this.socket.onclose = (data)=>{
                console.log('Websocket: closed');
                flushNotifications();
                this.socket = undefined;
                this.resetHandshakeStatus(false);
                this.dispatchBackendStatus();
                this.failStartedRequests("Backend disconnected");
                window.setTimeout(()=>{
                    this.updateState();
                }, 1000);
            };
            this.socket.onerror = (error)=>{
                console.log('Websocket: error: ' + JSON.stringify(error));
                flushNotifications();
                this._close();
                this.dispatchBackendStatus('Connection aborted');
                window.setTimeout(()=>{
                    this.updateState();
                }, 2000);
            };
        }
    }

    private _close() {
        if (this.socket == undefined) return;

        console.log('Websocket: disconnecting');
        try {
            this.socket.close();
        } catch(e) {
            console.log('Websocket Failed to close: ' + e);
        }
        this.resetHandshakeStatus(false);
        this.socket = undefined;
    }
}

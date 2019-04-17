import { update } from './shared/Obj'
import * as Store from './Store';
import * as Actions from './Actions';
import { compose, createStore } from 'redux';
import persistState from 'redux-localstorage'
import Notifier from './Notifier';

import * as AppStore from './AppStore';
import * as BackendStore from './BackendStore';
import * as FitsViewerStore from './FitsViewerStore';
import * as IndiManagerStore from './IndiManagerStore';
import * as MessageStore from './MessageStore';
import * as NotificationStore from './NotificationStore';
import * as SequenceStore from './SequenceStore';

export function start() {
    const initialState:Store.Content =  {
        ...AppStore.initialState,
        ...BackendStore.initialState,
        ...FitsViewerStore.initialState,
        ...IndiManagerStore.initialState,
        ...MessageStore.initialState,
        ...NotificationStore.initialState,
        ...SequenceStore.initialState,
    };

    var reducer = function() {
        var adjusters:Array<(state:Store.Content)=>Store.Content> = [
            ...AppStore.adjusters(),
            ...BackendStore.adjusters(),
            ...FitsViewerStore.adjusters(),
            ...IndiManagerStore.adjusters(),
            ...MessageStore.adjusters(),
            ...NotificationStore.adjusters(),
            ...SequenceStore.adjusters(),
        ];

        var actionsByApp = {};

        var reducer = function (state:Store.Content = initialState, action:any) {
            var prevJson = JSON.stringify(state);
            var prevState = state;

            var type = action.type;
            if (type == "update") {
                state = update(state, action.op);
            } else  if (type == "appAction") {
                var nvArgs = action.args.slice();
                nvArgs.unshift(state);
                try {
                    state = actionsByApp[action.app][action.method].apply(null, nvArgs);
                } catch(e) {
                    console.error('Error in ' + action.app + '.' + action.method, e);
                }
            } else {
                if (!Object.prototype.hasOwnProperty.call(Actions.registry, type)) {
                    console.log('invalid action: ', action);
                } else {
                    const newState = Actions.registry[type](state, action);
                    state = newState;
                }
            }
            state = adjusters.reduce((state, func) => (func(state)), state);

            return state;
        }

        return reducer;
    }();

    const enhancer = compose(
        (persistState as any)(undefined, {
                slicer: (paths:any)=> (state:any) => {
                    var rslt = Object.assign({}, state);
                    delete rslt.backend;
                    delete rslt.backendStatus;
                    delete rslt.backendError;
                    // console.log("WTF slicing result is " + JSON.stringify(rslt));
                    return rslt;
                }
            })
    );

    const store = createStore(reducer, initialState, enhancer);

    const notifier = new Notifier();

    notifier.attachToStore(store);

    // Connect notifier to websocket
    function stripLastPart(url:string)
    {
        var str = "" + url;
        var lastSlash = str.lastIndexOf('/');
        if (lastSlash == -1) return str;
        return str.substring(0, lastSlash + 1);
    }

    const apiRoot = //((window.location+'').indexOf('pludov') == -1) ?
        (window.location.protocol + '//' + window.location.hostname  + ':' + window.location.port + '/');
    //:*/ (stripLastPart(window.location) + 'api/');
    console.log('api root is at: ' + apiRoot);

    notifier.connect(apiRoot);

    Store.init(store, notifier);
}
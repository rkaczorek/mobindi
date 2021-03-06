import { BackofficeStatus } from '@bo/BackOfficeStatus';
import * as Actions from "./Actions";
import * as Store from "./Store";
import * as JsonProxy from './shared/JsonProxy';

export type Content = {
    backendStatus: number;
    backendError: string|null;
    // FIXME: switch that to nullable
    backend: Partial<BackofficeStatus>;
}

export const initialState:Content = {
    backendStatus: 0,
    backendError: null,
    backend: {
        apps: {}
    },
}

export const BackendStatus = {
    Idle: 0,
    Connecting: 1,
    Connected: 2,
    Paused: 3,
    Reconnecting: 4,        // Après la pause
    Failed: 5
}

const backendStatus: Actions.Handler<{ backendStatus: number, backendError?: string, data?: BackofficeStatus }>
    = (state, action) => {
        state = Object.assign({}, state);
        state.backendStatus = action.backendStatus;
        if (Object.prototype.hasOwnProperty.call(action, "backendError")) {
            state.backendError = action.backendError || null;
        }
        switch (state.backendStatus) {
            case BackendStatus.Connected:
                state.backend = action.data!;
                break;
            case BackendStatus.Paused:
            case BackendStatus.Reconnecting:
                break;
            default:
                state.backend = {};
        }
        return state;
    };

const notification : Actions.Handler<{data?:BackofficeStatus, diff?: JsonProxy.Diff, batch? : JsonProxy.Diff[]}>
    = (state, action) => {
        // Mettre le status du backend
        state = Object.assign({}, state);
        if (state.backendStatus != BackendStatus.Connected || state.backendError != null) {
            state.backendStatus = BackendStatus.Connected;
            state.backendError = null;
            state.backend = {};
        }
        if (action.data !== undefined) {
            state.backend = action.data;
        } else if (action.diff !== undefined) {
            state.backend = JsonProxy.default.applyDiff(state.backend, action.diff);
        } else if (action.batch !== undefined) {
            for(const diff of action.batch) {
                state.backend = JsonProxy.default.applyDiff(state.backend, diff);
            }
        }
        return state;
    }

const actions = {
    backendStatus,
    notification
}

export type Actions = typeof actions;

Actions.register<Actions>(actions);


export function adjusters():Array<(state:Store.Content)=>Store.Content> {
    return [];
}

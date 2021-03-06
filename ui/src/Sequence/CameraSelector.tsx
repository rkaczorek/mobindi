import * as React from 'react';
import { connect } from 'react-redux';

import * as Utils from '../Utils';
import * as Store from '../Store';
import PromiseSelector from '../PromiseSelector';

type InputProps = {
    getValue: (store:Store.Content, props: InputProps)=>string|null
}

const CameraSelector = connect((store:Store.Content, ownProps:InputProps)=> {
    const active = ownProps.getValue(store, ownProps);
    return ({
        active: active,
        availables: Utils.noErr(()=>store.backend.camera!.availableDevices, [])
    })
})(PromiseSelector);

export default CameraSelector;

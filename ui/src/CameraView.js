import React, { Component, PureComponent} from 'react';
import { notifier, BackendStatus } from './Store';
import { connect } from 'react-redux';
import FitsViewer from './FitsViewer';
import CameraSettingsView from './CameraSettingsView';
import './CameraView.css'

class CameraView extends PureComponent {

    constructor(props) {
        super(props);
        this.state = {url: 'test.jpg'};
        this.next = this.next.bind(this);
        this.shoot = this.shoot.bind(this);
    }

    render() {
        return(<div className="CameraView">
            <CameraSettingsView
                settingsPath={'backend/camera/currentSettings'.split('/')}
                descPath={'backend/camera/currentSettingDesc'.split('/')}/>
            <div className="FitsViewer">
                <FitsViewer src={this.state.url}/>
            </div>
            <input type="button" onClick={this.shoot} value="Shoot"/>
            <input type="button" onClick={this.next} value="next"/>
        </div>);
    }

    shoot() {
        var self = this;
        this.props.app.serverRequest({
            method: 'shoot',
            data: {
                dev: "CCD Simulator"
            }
        }).then((rslt)=>
        {
            console.log('got rslt:' + JSON.stringify(rslt));
            self.setState({url : 'fitsviewer/fitsviewer.cgi?path=' + encodeURIComponent(rslt.path)});
        }).start();
    }

    next() {
        this.setState({url: this.state.url != 'test.jpg' ? 'test.jpg' : 'http://127.0.0.1:18080/plop.png'});
    }
}


export default CameraView;
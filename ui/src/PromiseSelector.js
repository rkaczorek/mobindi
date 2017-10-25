import React, { Component, PureComponent} from 'react';
import PropTypes from 'prop-types';

/**
 * A selector that start a promise on update
 * 
 * Supported values: numbers, strings, booleans, null
 */
class PromiseSelector extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {};
    }
    render() {
        var active = this.props.active;
        if (active == undefined) active = null;

        var availables = this.props.availablesGenerator(this.props);
        if (!availables) availables = [];
        var options = [];

        if (this.state.forcedValue !== undefined) {
            active = this.state.forcedValue;
        }

        if (active == null || this.props.nullAlwaysPossible) {
            options.push(<option value='null' key='null'>{this.props.placeholder}</option>)
        }

        if (active != null) {
            var present = false;
            for(var o of availables) {
                if (this.props.getId(o, this.props) === active) {
                    present = true;
                }
            }
            if (!present) {
                options.push(<option value={JSON.stringify(active)} key={JSON.stringify(active)}>{active}</option>);
            }
        }

        for(var v of availables) {
            var id = JSON.stringify(this.props.getId(v, this.props));
            console.log("WTF key = " + id);
            options.push(<option value={id} key={id}>{this.props.getTitle(v, this.props)}</option>);
        }

        if (this.props.controls) {
            for(var v of this.props.controls) {
                var id = "ctrl:" + JSON.stringify(v.id);
                options.push(<option value={id} key={id}><i>{v.title}</i></option>);
            }
        }

        return <select
                    disabled={this.state.runningPromise !== undefined}
                    value={JSON.stringify(active)}
                    onChange={(e)=>this.clicked(e.target.value)}>{options}
            </select>;
    }

    clicked(value)
    {
        if (value !== null && value !== undefined && value.startsWith("ctrl:")) {
            var id = JSON.parse(value.substring(5));
            for(var v of this.props.controls) {
                if (v.id == id) {
                    
                    this.selectEntry(null, v.run);
                }
            }
        } else {
            this.selectEntry(JSON.parse(value), this.props.setValue);
        }
    }

    asyncUpdatePromise(from, to, forcedValue)
    {
        this.setState(function(prevState) {
            console.log('WTF Doing transition from ' + from + ' to ' + to);
            if (prevState.runningPromise === from) {
                console.log('WTF Really Doing transition from ' + from + ' to ' + to);
                return Object.assign({}, prevState, {
                    runningPromise: to,
                    forcedValue: forcedValue
                });
            }
        });
    }

    selectEntry(d, generator) {
        var self = this;
        if (generator === undefined) return;

        if (this.state.runningPromise) {
            this.state.runningPromise.cancel();
            this.setState(this.updatePromise(this.state.runningPromise, undefined, undefined));
        }
        var treatment = generator(d);

        function treatmentDone() {
            self.asyncUpdatePromise(treatment, undefined, undefined);
        }

        treatment.then(treatmentDone);
        treatment.onError(treatmentDone);
        treatment.onCancel(treatmentDone);
        this.asyncUpdatePromise(undefined, treatment, d);

        treatment.start();
    }
}

PromiseSelector.defaultProps = {
    getTitle: (e)=>'' + e,
    getId: (e)=>e,
    placeholder: 'Choose...',
    availablesGenerator: (props)=>props.availables
}

PromiseSelector.propTypes = {
    active: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
    ]),
    availables: PropTypes.array,
    availablesGenerator: PropTypes.func,
    placeholder: PropTypes.string,
    // entry from availables
    getTitle: PropTypes.func,
    getId: PropTypes.func,
    // receive an id, must return a promise
    setValue: PropTypes.func.isRequired,
    // Keep "null" always possible
    nullAlwaysPossible: PropTypes.bool
}


export default PromiseSelector;

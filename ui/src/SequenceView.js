import React, { Component, PureComponent} from 'react';
import PropTypes from 'prop-types';
import { notifier, BackendStatus } from './Store';
import { connect } from 'react-redux';

import { atPath } from './shared/JsonPath';
import './Table.css';

function firstDefined(a, b)
{
    if (a !== undefined) return a;
    return b;
}

class TableEntry extends PureComponent {

    render() {
        var content = [];
        for(var o of this.props.header)
        {
            var field = this.props.fields[o.id];
            var details;
            if ('render' in field) {
                details = field.render(this.props.item);
            } else {
                details = "" + this.props.item[o.id];
            }
            content.push(<td key={o.id}>
                {details}
            </td>)
        }
        return <tr>{content}</tr>
    }

    static mapStateToProps = function(store, ownProps)
    {
        var result= {
            item: ownProps.getItem(store, ownProps.uid)
        }
        console.log('map state to prop wtf:', ownProps.uid, JSON.stringify(result));
        return result;
    }
}

TableEntry = connect(TableEntry.mapStateToProps)(TableEntry);
TableEntry.propTypes = {
    uid: PropTypes.string.isRequired,
    statePath: PropTypes.string.isRequired,
    fields: PropTypes.object.isRequired,
    header: PropTypes.array.isRequired,
    // store, uid => item
    getItem: PropTypes.func.isRequired
}

/**
 * state for table is :
 *  (none)
 */
class Table extends PureComponent {

    render() {
        var content = [];
        for(var o of this.props.itemList)
        {
            content.push(<TableEntry key={o}
                fields={this.props.fields}
                header={this.props.header}
                getItem={this.props.getItem}
                statePath={this.props.statePath + '.items[' + JSON.stringify(o) + ']'}
                uid={o}
            />);
        }

        var cols = [];
        var header = [];
        for(var o of this.props.header) {
            var field = this.props.fields[o.id];
            header.push(<th key={o.id}>
                {o.id}
            </th>);
            cols.push(<col key={o.id} style={{width: field.defaultWidth}}/>);
        }
        return <div className="DataTable">
            <table className="DataTableHeader">
                <colgroup>
                    {cols}
                </colgroup>
                <thead>
                    <tr>{header}</tr>
                </thead>
            </table>
            <table className="DataTableData">
                <colgroup>
                    {cols}
                </colgroup>
                <tbody>
                    {content}
                </tbody>
            </table>
        </div>;
    }

    static mapStateToProps = function(store, ownProps)
    {
        // FIXME: dispatch the cleanup of state of entries
        return {
            itemList: ownProps.getItemList(store),
            header: firstDefined(atPath(store, ownProps.statePath + ".header"), ownProps.defaultHeader)
        };
    }
}

Table = connect(Table.mapStateToProps)(Table);
Table.propTypes = {
    statePath: PropTypes.string.isRequired,
    fields: PropTypes.object.isRequired,
    defaultHeader: PropTypes.array.isRequired,
    // store => [items]
    getItemList: PropTypes.func.isRequired,
    // store, uid => item
    getItem: PropTypes.func.isRequired
}

class ImageListEntry extends PureComponent {

    render() {
        return <div>{this.props.item.path}</div>;
    }
    static mapStateToProps = function(store, ownProps) {
        return({
            item: atPath(store, ownProps.uidListPath).byuuid[ownProps.imageUid]
        })
    }
}

ImageListEntry = connect(ImageListEntry.mapStateToProps)(ImageListEntry);
ImageListEntry.propTypes = {
    // Path to image details
    uidListPath: PropTypes.string.isRequired,
    imageUid: PropTypes.string.isRequired
}

class ImageList extends PureComponent {

    render() {
        var content = [];
        for(var o of this.props.items)
        {
            content.push(<ImageListEntry key={o} uidListPath={this.props.uidListPath} imageUid={o}/>);
        }
        return <div>{content}</div>;
    }

    static mapStateToProps = function(store, ownProps) {
        return({
            // FIXME: filter, cache
            items: atPath(store, ownProps.uidListPath).list
        })
    }
}

ImageList = connect(ImageList.mapStateToProps)(ImageList);
ImageList.propTypes = {
    // Path to image details
    uidListPath: PropTypes.string.isRequired
}

class SequenceView extends PureComponent {
    constructor(props) {
        super(props);
    }
    render() {
        //var self = this;
        return(<div className="CameraView">
            <Table statePath="$.sequenceView.list"
                fields={{
                    path: {
                        title:  'File',
                        defaultWidth: '15em',
                        render: (o)=>(o.path.indexOf('/') != -1 ? o.path.substring(o.path.lastIndexOf('/')+1) : o.path)
                    },
                    device: {
                        title:  'Device',
                        defaultWidth: '12em'
                    }
                }}
                defaultHeader={[{id: 'path'}, {id: 'device'}]}
                getItemList={(store)=>(atPath(store, '$.backend.camera.images.list'))}
                getItem={(store,uid)=>(atPath(store, '$.backend.camera.images.byuuid')[uid])}
            />
        </div>);
    }
}


export default SequenceView;
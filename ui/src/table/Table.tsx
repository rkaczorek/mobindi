import * as React from 'react';
import * as Store from '../Store';

import { atPath } from '../shared/JsonPath';
import './Table.css';
import TableEntry from './TableEntry';

export type HeaderItem = {
    id:string;
}

export type FieldDefinition = {
    render?:(item: any)=>React.ReactNode
    title: string;
    defaultWidth: string;
}

type InputProps = {
    statePath: string;
    currentPath: string;
    fields: {[id: string]: FieldDefinition},
    defaultHeader: Array<HeaderItem>,
    // store => [items]
    getItemList: (s:Store.Content)=>Array<string>,
    // store, uid => item
    getItem: (s:Store.Content, uid:string)=>any,
    onItemClick: (uid:string, e:React.MouseEvent<HTMLTableRowElement>)=>any,
}

type MappedProps = {
    itemList: Array<string>;
    header: Array<HeaderItem>;
    current: string;
}

type Props = InputProps & MappedProps;

function firstDefined<T>(a: T, b: T): T
{
    if (a !== undefined) return a;
    return b;
}

/**
 * state for table is :
 *  (none)
 */
class Table extends React.PureComponent<Props> {

    render() {
        const content = [];
        for(const o of this.props.itemList)
        {
            content.push(<TableEntry
                key={o}
                fields={this.props.fields}
                header={this.props.header}
                getItem={this.props.getItem}
                // statePath={this.props.statePath + '.items[' + JSON.stringify(o) + ']'}
                uid={o}
                onItemClick={this.props.onItemClick}
                selected={o===this.props.current}
            />);
        }

        const cols = [];
        const header = [];
        for(const o of this.props.header) {
            const field = this.props.fields[o.id];
            header.push(<th key={o.id}>
                {field.title}
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

    static mapStateToProps = function(store: Store.Content, ownProps: InputProps): MappedProps
    {
        // FIXME: dispatch the cleanup of state of entries
        return {
            itemList: ownProps.getItemList(store),
            header: firstDefined(atPath(store, ownProps.statePath + ".header"), ownProps.defaultHeader),
            current: atPath(store, ownProps.currentPath)
        };
    }
}

export default Store.Connect(Table);

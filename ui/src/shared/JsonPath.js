const jp = require('jsonpath');


// Returns the object if exactly one match
// throws an error if more than one match
// return undefined if none found.
// Accept undefined as object (will return undefined)
function atPath(object, path)
{
    if (object === undefined) {
        return undefined;
    }
    var rslt = jp.query(object, path, 2);
    switch(rslt.length) {
        case 0:
            return undefined;
        case 1:
            return rslt[0];
        default:
            throw new Error("More than one match in atPath");
    }
}

// Returns the parent object and the key (or undefined if not found)
function atParent(object, jspath)
{
    const path = parentLoc(jspath);

    const obj = atPath(object, jp.stringify(path.path))
    if (obj === undefined) {
        return undefined;
    }
    return {
        parent: obj,
        key: path.key
    };
}

function checkSimpleSubscript(path, item)
{
    if (item.scope !== 'child') {
        throw new Error("Invalid scope: " + path);
    }
    if (item.operation === 'member') {
        if (item.expression.type !== 'identifier') {
            throw new Error("Invalid member expression: " + path);
        }
    } else if (item.operation === 'subscript') {
        if (item.expression.type !== 'numeric_literal') {
            throw new Error("Invalid subscript expression: " + path);
        }
    } else {
        throw new Error("invalid path: " + path);

    }
}

function checkRelative(path, item)
{
    if (item.expression.type !== 'root') {
        throw new Error("Malformed path: " + path);
    }
}

function parentLoc(jspath)
{
    const path = jp.parse(jspath);
    if (path.length < 2) {
        throw new Error("Path has no parent: " + path);
    }
    const last = path[path.length - 1];
    path.splice(path.length - 1, 1);
    checkSimpleSubscript(jspath, last);
    
    return {
        path: path,
        key: last.expression.value
    };
}

function asDirectPath(jspath)
{
    const path = jp.parse(jspath);
    checkRelative(jspath, path[0]);
    let ret = [];
    for(let i = 1; i < path.length; ++i)
    {
        checkSimpleSubscript(jspath, path[i]);
        ret.push(path[i].expression.value);
    }
    return ret;
}

module.exports= {atPath, atParent, asDirectPath};
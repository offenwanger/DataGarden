let mockCanvas = require("./mock_canvas");

function Element(type) {
    let mAttrs = {};
    let mType = type;
    let mChildren = [];
    let mClasses = [];
    let mCallBacks = {};
    let mContext = null;

    this.append = function (appendee) {
        if (typeof appendee == 'string') {
            let result = new Element(appendee);
            mChildren.push(result);
            return result;
        } else {
            mChildren.push(appendee);
            return appendee;
        }
    }
    this.select = function (selector) {
        return mChildren.find(child => child.matches(selector)) || { node: () => null }
    }
    this.attr = function (att, val = null) {
        if (val !== null) {
            mAttrs[att] = val
            return this;
        };
        return mAttrs[att];
    };
    this.classed = function (name, isClass) {
        if (isClass) {
            mClasses.indexOf(name) === -1 ? mClasses.push(name) : null;
        } else {
            mClasses = mClasses.filter(c => c != name);
        }
        return this;
    }
    this.on = function (event, callback) {
        mCallBacks[event] = callback;
    }
    this.node = function () {
        // just put all the D3 and element mocks on the same object. Simpler that way.
        return this;
    }
    this.lower = function () {
        return this;
    }
    this.matches = function (selector) {
        if (selector[0] == "#") {
            return "#" + mAttrs["id"] == selector;
        } else if (selector[0] == ".") {
            return mClasses.some(c => "." + c == selector);
        } else {
            return mType == selector;
        }
    }
    this.getContext = function (type) {
        if (!mContext) mContext = mockCanvas.getContext();
        return mContext;
    }

}

function Transform(x = 0, y = 0, k = 1) {
    this.x = x;
    this.y = y;
    this.k = k;
    this.translate = function (x, y) { return new Transform(this.x + x, this.y + y, this.k) }
}

module.exports = function () {
    let strokeView = new Element("div");
    strokeView.append(new Element('div').classed("canvas-container", true))
    let interfaceContainer = new Element("div");

    let mockZoom = {
        scaleExtent: function () { return this },
        on: function (callback) { this.call = callback }
    }

    function select(selector) {
        if (selector == "#stroke-view") return strokeView;
        else if (selector == "#interface-container") return interfaceContainer;
    }


    this.select = select;
    this.zoom = () => mockZoom;
    this.zoomTransform = () => mockZoom;
    this.zoomIdentity = new Transform();
}
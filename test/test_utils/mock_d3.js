let mockCanvas = require("./mock_canvas");

function Element(type) {
    let mAttrs = {};
    let mType = type;
    let mChildren = [];
    let mCallBacks = {};
    let mContext = null;

    this.append = function (elementType) {
        let result = new Element(elementType);
        mChildren.push(result);
        return result;
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
    let cavnasContainer = new Element("div");
    let interfaceContainer = new Element("div");
    let mockZoom = {
        scaleExtent: function () { return this },
        on: function (callback) { this.call = callback }
    }

    function select(selector) {
        if (selector == "#canvas_container") return cavnasContainer;
        if (selector == "#interface_container") return interfaceContainer;
    }


    this.select = select;
    this.zoom = () => mockZoom;
    this.zoomTransform = () => mockZoom;
    this.zoomIdentity = new Transform();
}
let mockCanvas = require("./mock_canvas");

function MockElement(type) {
    let mAttrs = {};
    let mStyles = {};
    let mType = type;
    let mChildren = [];
    let mClasses = [];
    let mCallBacks = {};
    let mContext = null;

    this.append = function (appendee) {
        if (typeof appendee == 'string') {
            let result = new MockElement(appendee);
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
    this.style = function (style, val = null) {
        if (val !== null) {
            mStyles[style] = val
            return this;
        };
        return mStyles[style];
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
        if (!mContext) {
            mContext = mockCanvas.getContext(mAttrs['width'], mAttrs['height'])
        };

        return mContext;
    }
    this.getBoundingClientRect = function () {
        let x = 0, y = 0;
        if (d3.getRoot().select("#stroke-view").select('.canvas-container').select('.interaction-canvas') == this ||
            d3.getRoot().select("#stroke-view").select('.canvas-container').select('.interface-canvas') == this) {
            // x and y are 0, that's fine
        } else if (d3.getRoot().select("#vem-view").select('.canvas-container').select('.interaction-canvas') == this ||
            d3.getRoot().select("#vem-view").select('.canvas-container').select('.interface-canvas') == this) {
            y = d3.getRoot().select("#stroke-view").select('.canvas-container').select('.interface-canvas').attr('height')
        } else if (d3.getRoot().select("#struct-view").select('.canvas-container').select('.interaction-canvas') == this ||
            d3.getRoot().select("#struct-view").select('.canvas-container').select('.interface-canvas') == this) {
            x = d3.getRoot().select("#stroke-view").select('.canvas-container').select('.interface-canvas').attr('width')
        } else {
            console.error("Unexpected!")
        }

        return { x, y, width: mAttrs['width'], height: mAttrs['height'] };
    }
    this.getCallbacks = () => mCallBacks;

}

function Transform(x = 0, y = 0, k = 1) {
    this.x = x;
    this.y = y;
    this.k = k;
    this.translate = function (x, y) { return new Transform(this.x + x, this.y + y, this.k) }
}

module.exports = function () {
    let rootNode = new MockElement();
    rootNode.append('div').attr("id", "stroke-view").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "vem-view").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "struct-view").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "interface-container");

    let documentCallbacks = {};

    let mockZoom = {
        scaleExtent: function () { return this },
        on: function (callback) { this.call = callback },
        x: 0,
        y: 0,
        k: 1,
    }

    function select(selector) {
        if (selector.isDocument || selector.isWindow) {
            return { on: (event, callback) => documentCallbacks[event] = callback };
        } else {
            return rootNode.select(selector);
        }
    }


    this.select = select;
    this.zoom = () => mockZoom;
    this.zoomTransform = () => mockZoom;
    this.zoomIdentity = new Transform();
    this.getCallbacks = () => documentCallbacks;
    this.getRoot = () => rootNode;
}
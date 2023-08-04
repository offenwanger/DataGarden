const { createCanvas } = require('canvas')
const fs = require('fs')

let mJspreadsheet;

function MockElement(type) {
    let mAttrs = {};
    let mStyles = {};
    let mType = type;
    let mChildren = [];
    let mClasses = [];
    let mCallBacks = {};
    let mCanvas = null;
    let transform = new mockTransform();

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
    // this is only ever used to remove the tables
    this.selectAll = function (selector) {
        return {
            remove: () => {
                mChildren.forEach(c => mJspreadsheet.removeTable(c));
                mChildren = [];
            }
        }
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
        if (selector == "*") {
            return true;
        } else if (selector[0] == "#") {
            return "#" + mAttrs["id"] == selector;
        } else if (selector[0] == ".") {
            return mClasses.some(c => "." + c == selector);
        } else {
            return mType == selector;
        }
    }
    this.getContext = function (type) {
        if (!mCanvas) {
            mCanvas = createCanvas(mAttrs['width'], mAttrs['height'])
        };

        return mCanvas.getContext(type);
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
    this.call = function (something, newZoomTransform) {
        transform = newZoomTransform;
    };
    this.getTransform = function () {
        return transform;
    }
    this.console = {
        log: function () {
            const out = fs.createWriteStream(__dirname + '/debug.jpeg')
            const stream = mCanvas.createJPEGStream()
            stream.pipe(out)
            out.on('finish', () => { /** keeping this in case need it for debugging */ })
        }
    }
}

function mockTransform(x = 0, y = 0, k = 1) {
    this.x = x;
    this.y = y;
    this.k = k;
    this.translate = function (x, y) { return new mockTransform(this.x + x, this.y + y, this.k) }
    this.scale = function (k) { return new mockTransform(this.x, this.y, this.k * k) }
}

module.exports = function (jspreadsheet) {
    mJspreadsheet = jspreadsheet;
    let rootNode = new MockElement();
    rootNode.append('div').attr("id", "stroke-view").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "vem-view").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "struct-view").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "table-view");
    rootNode.append('div').attr("id", "interface-container");

    let documentCallbacks = {};

    function select(selector) {
        if (selector.isDocument || selector.isWindow) {
            return { on: (event, callback) => documentCallbacks[event] = callback };
        } else {
            return rootNode.select(selector);
        }
    }


    this.select = select;
    this.zoomIdentity = new mockTransform();
    this.getCallbacks = () => documentCallbacks;
    this.getRoot = () => rootNode;
}
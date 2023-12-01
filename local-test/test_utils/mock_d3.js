const { createCanvas } = require('./mock_canvas.js')
const fs = require('fs')
const RUN = Math.random();
let fileCount = 0;

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
        if (selector instanceof MockElement) return selector;
        let stack = [...mChildren]
        while (stack.length > 0) {
            let found = stack.find(child => child.matches(selector));
            if (found) return found;
            stack = (stack.map(item => item.getChildren())).flat();
        }
        return { node: () => null, remove: () => null };
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
    this.html = function (html) {
        if (html) {
            this.innerHtml = html;
            return this;
        } else {
            return this.innerHtml;
        }
    }
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
        return this;
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
            mCanvas = createCanvas()
            mCanvas.height = mAttrs['height'];
            mCanvas.width = mAttrs['width'];

        };
        return mCanvas.getContext(type);
    }
    this.getBoundingClientRect = function () {
        let x = 0, y = 0;
        if (d3.getRoot().select("#canvas-view-container").select('.canvas-container').select('.interaction-canvas') == this ||
            d3.getRoot().select("#canvas-view-container").select('.canvas-container').select('.interface-canvas') == this) {
            // x and y are 0, that's fine
        } else if (d3.getRoot().select("#fdl-view-container").select('.canvas-container').select('.interaction-canvas') == this ||
            d3.getRoot().select("#fdl-view-container").select('.canvas-container').select('.interface-canvas') == this) {
            x = d3.getRoot().select("#fdl-view-container").select('.canvas-container').select('.interface-canvas').attr('width')
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
    this.console = { log: function () { if (mCanvas) mCanvas.console.log() } }
    this.remove = function () {
        delete this;
    }
    this.getChildren = () => mChildren;
}

function polygonHull(points) {
    if (points.length == 0) return null;
    let yMax = Math.max(...points.map(p => p[1]));
    let yMin = Math.min(...points.map(p => p[1]));
    let xMax = Math.max(...points.map(p => p[0]));
    let xMin = Math.min(...points.map(p => p[0]));
    return [
        [xMax, yMax],
        [xMax, yMin],
        [xMin, yMin],
        [xMin, yMax]
    ];
}

function mockTransform(x = 0, y = 0, k = 1) {
    this.x = x;
    this.y = y;
    this.k = k;
    this.translate = function (x, y) { return new mockTransform(this.x + x, this.y + y, this.k) }
    this.scale = function (k) { return new mockTransform(this.x, this.y, this.k * k) }
}

function mockForceSim() {
    let tickCallback = () => { };
    let nodes = [];
    let links = [];

    this.tick = function () {
        nodes.forEach((node, index) => {
            let y = Math.round(index / 10);
            let x = index % 10;
            node.x = x * Size.ELEMENT_NODE_SIZE * 4 + Size.ELEMENT_NODE_SIZE * 2;
            node.y = y * Size.ELEMENT_NODE_SIZE * 4 + Size.ELEMENT_NODE_SIZE * 2;
        })

        links.forEach((link) => {
            if (typeof link.source == "string") {
                link.source = nodes.find(node => node.id == link.source);
            }
            if (typeof link.target == "string") {
                link.target = nodes.find(node => node.id == link.target);
            }

            link.source.x = nodes.find(n => n.id == link.source.id).x;
            link.source.y = nodes.find(n => n.id == link.source.id).y;
            link.target.x = nodes.find(n => n.id == link.target.id).x;
            link.target.y = nodes.find(n => n.id == link.target.id).y;
        })
        tickCallback();
    }

    this.getPosition = (nodeId) => {
        let result = nodes.find(n => n.id == nodeId);
        if (result) {
            return { x: result.x, y: result.y }
        } else console.error("Item not in view", nodeId);
    }

    this.getLinkPosition = (nodeId) => {
        let node = nodes.find(n => n.id == nodeId);
        let link = links.find(l => l.target.id == nodeId);
        let parent = link ? link.source : null;
        return VectorUtil.scale(new DrawingUtil().getTrianglePointer(parent, node, Size.ELEMENT_NODE_SIZE, 10)
            .reduce((prev, curr) => VectorUtil.add(prev, curr)), 1 / 3);
    }

    this.force = function () { return this };
    this.nodes = (n) => { nodes = n; return this };
    this.alpha = () => { return this };
    this.alphaDecay = () => { return this };
    this.velocityDecay = () => { return this };
    this.alphaTarget = () => { return this };
    this.restart = () => { return this };
    this.links = (l) => { links = l; return this };
    this.on = function (event, func) {
        if (event == 'tick') {
            tickCallback = func;
        } else {
            console.error("not handled", event);
        };
        return this;
    };
    this.stop = () => { return this; };
    this.getNodes = () => nodes;
}

function mockForce() {
    this.x = () => { return this };
    this.y = () => { return this };
    this.id = () => { return this };
    this.strength = () => { return this };
}

function mockXMLPromise(img) {
    this.then = function (callback) {
        return this;
    }
    this.catch = function () {
        return this;
    }
}

function ordinalScale(value) {
    return "#FF0000";
}
ordinalScale.domain = function () { return this };

function mockQuadTree() {
    this.x = () => { return this };
    this.y = () => { return this };
    this.extent = () => { return this };
    this.addAll = () => { return this };
    this.visit = () => { return this };

}

module.exports = function (jspreadsheet) {
    mJspreadsheet = jspreadsheet;
    let rootNode = new MockElement();
    let forceSim = new mockForceSim();
    rootNode.append('div').attr("id", "canvas-view-container").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "fdl-view-container").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "tabs-container").append(new MockElement().classed("canvas-container", true));;
    rootNode.append('div').attr("id", "color-container");
    rootNode.append('div').attr("id", "interface-container");
    rootNode.append('div').attr("id", "dashboard-container");
    rootNode.append('div').attr("id", "canvas-container");
    rootNode.append('div').attr("id", "tab-view-container");
    rootNode.append('div').attr("id", "canvas-container");
    rootNode.append('div').attr("id", "canvas-container");
    rootNode.append('div').attr("id", "table-view-container");
    rootNode.append('div').attr("id", "interface-svg");
    rootNode.append('div').attr("id", "input-box");
    rootNode.append('div').attr("id", "dropdown-container");

    let documentCallbacks = {};

    function select(selector) {
        if (selector.isDocument || selector.isWindow) {
            return { on: (event, callback) => documentCallbacks[event] = callback };
        } else {
            return rootNode.select(selector);
        }
    }


    this.select = select;
    this.polygonHull = polygonHull;
    this.zoomIdentity = new mockTransform();
    this.getCallbacks = () => documentCallbacks;
    this.getRoot = () => rootNode;
    this.forceSimulation = () => forceSim;
    this.scaleOrdinal = () => ordinalScale;
    this.quadtree = () => new mockQuadTree();
    this.forceCenter = () => new mockForce();
    this.forceCollide = () => new mockForce();
    this.forceX = () => new mockForce();
    this.forceY = () => new mockForce();
    this.forceLink = () => new mockForce();
    this.xml = (img) => new mockXMLPromise(img);
    this.tick = () => forceSim.tick();
    this.getPosition = (id) => forceSim.getPosition(id);
    this.getLinkPosition = (id) => forceSim.getLinkPosition(id);
    this.getNodes = () => forceSim.getNodes();
}
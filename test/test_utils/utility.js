let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

function deepEquals(original, obj) {
    if (original && typeof original == 'object') {
        Object.keys(original).forEach(key => {
            deepEquals(original[key], obj[key]);
        })
    } else if (typeof original == 'function') {
        assert(typeof obj, 'function');
        return;
    } else {
        expect(original).to.eql(obj);
    }
}

function makeModel() {
    let dataModel = new DataModel();
    dataModel.getGroups().push(new Data.Group());
    dataModel.getGroups()[0].elements.push(new Data.Element(10, 10, 20, 20));
    dataModel.getGroups()[0].elements[0].strokes.push(new Data.Stroke([{ x: 5, y: 5 }, { x: 10, y: 10 }, { x: 15, y: 5 }], 10, "#000000FF"));
    dataModel.getGroups()[0].elements[0].strokes.push(new Data.Stroke([{ x: 5, y: 15 }, { x: 10, y: 10 }, { x: 15, y: 10 }], 10, "#000000FF"));

    dataModel.getGroups()[0].elements.push(new Data.Element(30, 30, 20, 20));
    dataModel.getGroups()[0].elements[1].strokes.push(new Data.Stroke([{ x: 5, y: 5 }, { x: 10, y: 10 }, { x: 15, y: 10 }], 10, "#000000FF"));
    dataModel.getGroups()[0].elements[1].strokes.push(new Data.Stroke([{ x: 5, y: 15 }, { x: 10, y: 10 }, { x: 15, y: 5 }], 10, "#000000FF"));

    dataModel.getGroups().push(new Data.Group());
    dataModel.getGroups()[1].elements.push(new Data.Element(-10, -10, 40, 40));
    dataModel.getGroups()[1].elements[0].strokes.push(new Data.Stroke([{ x: 5, y: 5 }, { x: 35, y: 35 }], 10, "#000000FF"));

    return dataModel;
}

function drawStroke(integrationEnv, path) {
    integrationEnv.d3.getCallbacks()['keydown']({ key: "d" });
    drag(integrationEnv, "#stroke-view", path);
    integrationEnv.d3.getCallbacks()['keyup']({ key: "d" });
}

function drag(integrationEnv, id, path) {
    let offset = { x: 0, y: 0 }
    if (id == "#vem-view") offset.y += window.innerHeight / 2;
    if (id == "#struct-view") offset.x += window.innerWidth / 2;

    let start = { clientX: path[0].x + offset.x, clientY: path[0].y + offset.y };
    integrationEnv.d3.getCallbacks()['pointermove'](start);
    integrationEnv.d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown'](start);
    path.forEach(p => {
        integrationEnv.d3.getCallbacks()['pointermove']({ clientX: p.x + offset.x, clientY: p.y + offset.y });
    })
    integrationEnv.d3.getCallbacks()['pointerup']({ clientX: path[path.length - 1].x + offset.x, clientY: path[path.length - 1].y + offset.y });
}

function mouseOver(integrationEnv, id, x, y) {
    let offset = { x: 0, y: 0 }
    if (id == "#vem-view") offset.y += window.innerHeight / 2;
    if (id == "#struct-view") offset.x += window.innerWidth / 2;
    integrationEnv.d3.getCallbacks()['pointermove']({ clientX: x + offset.x, clientY: y + offset.y });
}

function pan(integrationEnv, id, x, y) {
    let offset = { x: 0, y: 0 }
    if (id == "#vem-view") offset.y += window.innerHeight / 2;
    if (id == "#struct-view") offset.x += window.innerWidth / 2;
    let start = { clientX: 10 + offset.x, clientY: 10 + offset.y };
    let end = { clientX: 10 + offset.x - x, clientY: 10 + offset.y - y }

    integrationEnv.d3.getCallbacks()['keydown']({ key: "a" });
    integrationEnv.d3.getCallbacks()['pointermove'](start);
    integrationEnv.d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown'](start);
    integrationEnv.d3.getCallbacks()['pointermove'](end);
    integrationEnv.d3.getCallbacks()['pointerup'](end);
    integrationEnv.d3.getCallbacks()['keyup']({ key: "a" });
}

function zoom(integrationEnv, id, zoomCenter, scale) {
    let offset = { x: 0, y: 0 }
    if (id == "#vem-view") offset.y += window.innerHeight / 2;
    if (id == "#struct-view") offset.y += window.innerHeight / 2;

    let start = { clientX: zoomCenter.x + offset.x, clientY: zoomCenter.y + offset.y };
    let end = { clientX: zoomCenter.x + offset.x, clientY: zoomCenter.y + offset.y + (scale - 1) * window.innerHeight / 2 }

    integrationEnv.d3.getCallbacks()['keydown']({ key: "a" });
    integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
    integrationEnv.d3.getCallbacks()['pointermove'](start);
    integrationEnv.d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown'](start);
    integrationEnv.d3.getCallbacks()['pointermove'](end);
    integrationEnv.d3.getCallbacks()['pointerup'](end);
    integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
    integrationEnv.d3.getCallbacks()['keyup']({ key: "a" });
}

module.exports = {
    makeModel,
    deepEquals,
    drawStroke,
    drag,
    mouseOver,
    pan, zoom,
}
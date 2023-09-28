let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;
let suite = require("./suite_enviroment")

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

function makeModel(version = 0) {
    let dataModel = new DataModel();
    dataModel.getGroups().push(new Data.Group());
    dataModel.getGroups()[0].elements.push(new Data.Element(10, 10));
    dataModel.getGroups()[0].elements[0].strokes.push(new Data.Stroke([{ x: 5, y: 5 }, { x: 10, y: 10 }, { x: 15, y: 5 }], 10, "#000000FF"));
    dataModel.getGroups()[0].elements[0].strokes.push(new Data.Stroke([{ x: 5, y: 15 }, { x: 10, y: 10 }, { x: 15, y: 10 }], 10, "#000000FF"));

    dataModel.getGroups()[0].elements.push(new Data.Element(30, 30));
    dataModel.getGroups()[0].elements[1].strokes.push(new Data.Stroke([{ x: 5, y: 5 }, { x: 10, y: 10 }, { x: 15, y: 10 }], 10, "#000000FF"));
    dataModel.getGroups()[0].elements[1].strokes.push(new Data.Stroke([{ x: 5, y: 15 }, { x: 10, y: 10 }, { x: 15, y: 5 }], 10, "#000000FF"));

    dataModel.getGroups().push(new Data.Group());
    dataModel.getGroups()[1].elements.push(new Data.Element(-10, -10));
    dataModel.getGroups()[1].elements[0].strokes.push(new Data.Stroke([{ x: 5, y: 5 }, { x: 35, y: 35 }], 10, "#000000FF"));

    if (version > 0) {
        dataModel.getGroups().push(new Data.Group());
        dataModel.getGroups()[2].parentId = dataModel.getGroups()[1].id;
        dataModel.getGroups()[2].elements.push(new Data.Element(20, 20));
        dataModel.getGroups()[2].elements.push(new Data.Element(40, 40));
        dataModel.getGroups()[2].elements[0].strokes.push(new Data.Stroke([{ x: 15, y: 105 }, { x: 15, y: 35 }], 10, "#000000FF"));
        dataModel.getGroups()[2].elements[1].strokes.push(new Data.Stroke([{ x: 25, y: 105 }, { x: 25, y: 35 }], 10, "#000000FF"));
        dataModel.getGroups()[2].elements[0].parentId = dataModel.getGroups()[1].elements[0].id;
        dataModel.getGroups()[2].elements[1].parentId = dataModel.getGroups()[1].elements[0].id;

        dataModel.getGroups().push(new Data.Group());
        dataModel.getGroups()[3].parentId = dataModel.getGroups()[1].id;
        dataModel.getGroups()[3].elements.push(new Data.Element(50, 50));
        dataModel.getGroups()[3].elements.push(new Data.Element(80, 80));
        dataModel.getGroups()[3].elements[0].strokes.push(new Data.Stroke([{ x: 35, y: 105 }, { x: 35, y: 35 }], 10, "#000000FF"));
        dataModel.getGroups()[3].elements[1].strokes.push(new Data.Stroke([{ x: 65, y: 105 }, { x: 65, y: 35 }], 10, "#000000FF"));
        dataModel.getGroups()[3].elements[0].parentId = dataModel.getGroups()[1].elements[0].id;
        dataModel.getGroups()[3].elements[1].parentId = dataModel.getGroups()[1].elements[0].id;

        dataModel.getGroups().push(new Data.Group());
        dataModel.getGroups()[4].parentId = dataModel.getGroups()[3].id;
        dataModel.getGroups()[4].elements.push(new Data.Element(60, 60));
        dataModel.getGroups()[4].elements.push(new Data.Element(70, 70));
        dataModel.getGroups()[4].elements[0].strokes.push(new Data.Stroke([{ x: 45, y: 105 }, { x: 45, y: 35 }], 10, "#000000FF"));
        dataModel.getGroups()[4].elements[1].strokes.push(new Data.Stroke([{ x: 55, y: 105 }, { x: 55, y: 35 }], 10, "#000000FF"));
        dataModel.getGroups()[4].elements[0].parentId = dataModel.getGroups()[3].elements[0].id;
        dataModel.getGroups()[4].elements[1].parentId = dataModel.getGroups()[3].elements[1].id;
    }

    return dataModel;
}

function drawStroke(integrationEnv, path) {
    integrationEnv.d3.getCallbacks()['keydown']({ key: "d" });
    drag(integrationEnv, "#stroke-view", path);
    integrationEnv.d3.getCallbacks()['keyup']({ key: "d" });
}

function drag(integrationEnv, id, path) {
    let offset = { x: 0, y: 0 }
    if (id == "#fdl-view") offset.x += window.innerWidth / 2;

    let start = { clientX: path[0].x + offset.x, clientY: path[0].y + offset.y };
    let end = { clientX: path[path.length - 1].x + offset.x, clientY: path[path.length - 1].y + offset.y };
    integrationEnv.d3.getCallbacks()['pointermove'](start);
    integrationEnv.d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown'](start);
    path.forEach(p => {
        integrationEnv.d3.getCallbacks()['pointermove']({ clientX: p.x + offset.x, clientY: p.y + offset.y });
    })
    integrationEnv.d3.getCallbacks()['pointerup'](end);
    // this last simulates the actual input that a mouse would give
    integrationEnv.d3.getCallbacks()['pointermove'](end);
}

function click(integrationEnv, id, pos) {
    let offset = { x: 0, y: 0 }
    if (id == "#fdl-view") offset.x += window.innerWidth / 2;

    integrationEnv.d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown']({ clientX: pos.x + offset.x, clientY: pos.y + offset.y });
    integrationEnv.d3.getCallbacks()['pointerup']({ clientX: pos.x + offset.x, clientY: pos.y + offset.y });
}

function mouseOver(integrationEnv, id, point) {
    let offset = { x: 0, y: 0 }
    if (id == "#fdl-view") offset.x += window.innerWidth / 2;

    integrationEnv.d3.getCallbacks()['pointermove']({ clientX: point.x + offset.x, clientY: point.y + offset.y });
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

function longPress(integrationEnv, id, x, y) {
    let offset = { x: 0, y: 0 }
    if (id == "#vem-view") offset.y += window.innerHeight / 2;
    if (id == "#struct-view") offset.x += window.innerWidth / 2;
    integrationEnv.d3.select('#interface-container').select('#interface-svg')
        .getCallbacks()['pointerdown']({ clientX: x + offset.x, clientY: y + offset.y });
    integrationEnv.clearTimeouts();
    integrationEnv.d3.getCallbacks()['pointerup']({ clientX: x + offset.x, clientY: y + offset.y });
}

function clickMenuButton(integrationEnv, id) {
    d3.select('#interface-container').select('#interface-svg').select(id).select('.button-overlay').getCallbacks()['pointerup']()
}

async function undo(integrationEnv) {
    await integrationEnv.d3.getCallbacks()['keydown']({ ctrlKey: true, key: "z" });
    integrationEnv.d3.getCallbacks()['keyup']({ ctrlKey: true, key: "z" });
}

async function redo(integrationEnv) {
    await integrationEnv.d3.getCallbacks()['keydown']({ ctrlKey: true, key: "y" });
    integrationEnv.d3.getCallbacks()['keyup']({ ctrlKey: true, key: "y" });
}

function getCanvas(view, layer) {
    // view can be stroke or fdl
    // layer can be view, interaction, or interface
    return d3.select("#" + view + "-view").select('.canvas-container').select('.' + layer + '-canvas');
}

module.exports = {
    makeModel,
    deepEquals,
    drawStroke,
    drag,
    click,
    mouseOver,
    pan, zoom,
    longPress,
    clickMenuButton,
    undo, redo,
    getCanvas,
}
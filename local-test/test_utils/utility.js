import { DataModel } from '../../local/js/data_model.js';
import { Data } from '../../local/js/data_structs.js';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

function Event(clientX = 0, clientY = 0) {
    this.clientX = clientX;
    this.clientY = clientY;
    this.stopPropagation = () => { };
}

export function deepEquals(original, obj) {
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

export function makeModel() {
    let dataModel = new DataModel();
    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[0].strokes.push(new Data.Stroke([{ x: 5, y: 5 }, { x: 10, y: 10 }, { x: 15, y: 5 }], 10, "#000000FF"));
    dataModel.getElements()[0].strokes.push(new Data.Stroke([{ x: 5, y: 15 }, { x: 10, y: 10 }, { x: 15, y: 10 }], 10, "#000000FF"));

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[1].strokes.push(new Data.Stroke([{ x: 5, y: 5 }, { x: 10, y: 10 }, { x: 15, y: 10 }], 10, "#000000FF"));
    dataModel.getElements()[1].strokes.push(new Data.Stroke([{ x: 5, y: 15 }, { x: 10, y: 10 }, { x: 15, y: 5 }], 10, "#000000FF"));

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[2].strokes.push(new Data.Stroke([{ x: 5, y: 5 }, { x: 35, y: 35 }], 10, "#000000FF"));
    dataModel.getElements()[2].parentId = dataModel.getElements()[1].id;

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[3].strokes.push(new Data.Stroke([{ x: 15, y: 105 }, { x: 15, y: 35 }], 10, "#000000FF"));
    dataModel.getElements()[3].parentId = dataModel.getElements()[1].id;

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[4].strokes.push(new Data.Stroke([{ x: 25, y: 105 }, { x: 25, y: 35 }], 10, "#000000FF"));
    dataModel.getElements()[4].parentId = dataModel.getElements()[1].id;

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[5].parentId = dataModel.getElements()[1].id;

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[6].strokes.push(new Data.Stroke([{ x: 35, y: 105 }, { x: 35, y: 35 }], 10, "#000000FF"));
    dataModel.getElements()[6].parentId = dataModel.getElements()[1].id;

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[7].strokes.push(new Data.Stroke([{ x: 65, y: 105 }, { x: 65, y: 35 }], 10, "#000000FF"));
    dataModel.getElements()[7].parentId = dataModel.getElements()[1].id;

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[8].parentId = dataModel.getElements()[3].id;

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[9].strokes.push(new Data.Stroke([{ x: 55, y: 105 }, { x: 55, y: 35 }], 10, "#000000FF"));
    dataModel.getElements()[9].parentId = dataModel.getElements()[3].id;

    dataModel.getElements().push(new Data.Element());
    dataModel.getElements()[10].strokes.push(new Data.Stroke([{ x: 45, y: 105 }, { x: 45, y: 35 }], 10, "#000000FF"));
    dataModel.getElements()[10].parentId = dataModel.getElements()[3].id;

    return dataModel;
}

export function drawStroke(integrationEnv, path) {
    d3.getCallbacks()['keydown']({ key: "d" });
    drag(integrationEnv, "#canvas-view-container", path);
    d3.getCallbacks()['keyup']({ key: "d" });
}

export function drawSelection(integrationEnv, path) {
    d3.getCallbacks()['keydown']({ key: "s" });
    drag(integrationEnv, "#canvas-view-container", path);
    d3.getCallbacks()['keyup']({ key: "s" });
}

export function drag(integrationEnv, id, path) {
    let offset = { x: 0, y: 0 }
    if (id == "#fdl-view-container") offset.x += window.innerWidth / 2;

    let eventStart = new Event(path[0].x + offset.x, path[0].y + offset.y)
    d3.getCallbacks()['pointermove'](eventStart);
    d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown'](eventStart);
    path.forEach(p => {
        let event = new Event(p.x + offset.x, p.y + offset.y)
        d3.getCallbacks()['pointermove'](event);
    })
    let eventEnd = new Event(path[path.length - 1].x + offset.x, path[path.length - 1].y + offset.y);
    d3.getCallbacks()['pointerup'](eventEnd);
    // this last simulates the actual input that a mouse would give
    d3.getCallbacks()['pointermove'](eventEnd);
}

export function click(integrationEnv, id, pos) {
    let offset = { x: 0, y: 0 }
    if (id == "#fdl-view-container") offset.x += window.innerWidth / 2;

    d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown'](new Event(pos.x + offset.x, pos.y + offset.y));
    d3.getCallbacks()['pointerup'](new Event(pos.x + offset.x, pos.y + offset.y));
}

export function mouseOver(integrationEnv, id, point) {
    let offset = { x: 0, y: 0 }
    if (id == "#fdl-view-container") offset.x += window.innerWidth / 2;

    d3.getCallbacks()['pointermove'](new Event(point.x + offset.x, point.y + offset.y));
}

export function pan(integrationEnv, id, x, y) {
    let offset = { x: 0, y: 0 }
    if (id == "#vem-view") offset.y += window.innerHeight / 2;
    if (id == "#struct-view") offset.x += window.innerWidth / 2;
    let start = new Event(10 + offset.x, 10 + offset.y);
    let end = new Event(10 + offset.x - x, 10 + offset.y - y)

    d3.getCallbacks()['keydown']({ key: "a" });
    d3.getCallbacks()['pointermove'](start);
    d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown'](start);
    d3.getCallbacks()['pointermove'](end);
    d3.getCallbacks()['pointerup'](end);
    d3.getCallbacks()['keyup']({ key: "a" });
}

export function zoom(integrationEnv, id, zoomCenter, scale) {
    let offset = { x: 0, y: 0 }
    if (id == "#vem-view") offset.y += window.innerHeight / 2;
    if (id == "#struct-view") offset.y += window.innerHeight / 2;

    let start = new Event(zoomCenter.x + offset.x, zoomCenter.y + offset.y);
    let end = new Event(zoomCenter.x + offset.x, zoomCenter.y + offset.y + (scale - 1) * window.innerHeight / 2)

    d3.getCallbacks()['keydown']({ key: "a" });
    d3.getCallbacks()['keydown']({ key: "s" });
    d3.getCallbacks()['pointermove'](start);
    d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown'](start);
    d3.getCallbacks()['pointermove'](end);
    d3.getCallbacks()['pointerup'](end);
    d3.getCallbacks()['keydown']({ key: "s" });
    d3.getCallbacks()['keyup']({ key: "a" });
}

export function longPress(integrationEnv, id, x, y) {
    let offset = { x: 0, y: 0 }
    if (id == "#vem-view") offset.y += window.innerHeight / 2;
    if (id == "#struct-view") offset.x += window.innerWidth / 2;
    d3.select('#interface-container').select('#interface-svg')
        .getCallbacks()['pointerdown'](new Event(x + offset.x, y + offset.y));
    integrationEnv.clearTimeouts();
    d3.getCallbacks()['pointerup'](new Event(x + offset.x, y + offset.y));
}

export function clickMenuButton(integrationEnv, id) {
    d3.select('#interface-container').select('#interface-svg').select(id).select('.button-overlay').getCallbacks()['pointerup']()
}

export function clickContextMenuButton(integrationEnv, buttonId) {
    let button = d3.select("#context-menu").select(buttonId);
    let pointerdown = button.getCallbacks()['pointerdown'];
    let pointerup = button.getCallbacks()['pointerup'];
    pointerdown.call(button, new Event());
    pointerup.call(button, new Event());
}

export async function undo(integrationEnv) {
    await d3.getCallbacks()['keydown']({ ctrlKey: true, key: "z" });
    d3.getCallbacks()['keyup']({ ctrlKey: true, key: "z" });
}

export async function redo(integrationEnv) {
    await d3.getCallbacks()['keydown']({ ctrlKey: true, key: "y" });
    d3.getCallbacks()['keyup']({ ctrlKey: true, key: "y" });
}

export function getCanvas(view, layer) {
    // view can be stroke or fdl
    // layer can be view, interaction, or interface
    return d3.select("#" + view + "-view").select('.canvas-container').select('.' + layer + '-canvas');
}

export function clickSelect(integrationEnv, id, pos) {
    d3.getCallbacks()['keydown']({ key: "s" });
    click(integrationEnv, id, pos);
    d3.getCallbacks()['keyup']({ key: "s" });
}
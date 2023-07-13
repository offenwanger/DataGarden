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
    integrationEnv.d3.getCallbacks()['pointermove']({ clientX: path[0].x, clientY: path[0].y });
    integrationEnv.d3.select('#interface-container').select('#interface-svg').getCallbacks()['pointerdown']({ clientX: path[0].x, clientY: path[0].y });
    path.forEach(p => {
        integrationEnv.d3.getCallbacks()['pointermove']({ clientX: p.x, clientY: p.y });
    })
    integrationEnv.d3.getCallbacks()['pointerup']({ clientX: path[path.length - 1].x, clientY: path[path.length - 1].y });
    integrationEnv.d3.getCallbacks()['keyup']({ key: "d" });
}

module.exports = {
    makeModel,
    deepEquals,
    drawStroke,
}
let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

describe('Struct View Controller Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });


    describe('struct view highlight tests', function () {
        it('should highlight all three views when mousing over the struct view', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 },])
            utility.drawStroke(integrationEnv, [{ x: 30, y: 20 }, { x: 50, y: 40 }, { x: 90, y: 60 }, { x: 20, y: 80 },])

            utility.pan(integrationEnv, "#struct-view", -20, -20)
            utility.zoom(integrationEnv, "#struct-view", { x: 20, y: 20 }, 2)
            utility.mouseOver(integrationEnv, "#struct-view", 50, 50);

            let model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 2);
            assert.equal(model.getGroups().length, 1);

            let ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(30, 30, 1, 1)), "#ff0000");

            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(0, 0, 1, 1)), "#ff0000");
        });
    });

    describe('dimention tests', function () {
        it('should create a dimention', async function () {
            integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
            utility.longPress(integrationEnv, "#struct-view", 50, 50);
            utility.longPress(integrationEnv, "#struct-view", 25, 50);
            integrationEnv.d3.getCallbacks()['keyup']({ key: "s" });

            let model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getDimentions().length, 2);

            let ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.view-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(30, 30, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(26, 51, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(51, 51, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(26, 100, 1, 1)), "#ffffff");
        });

        it('should create a dimention around groups', async function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 45, y: 40 }, { x: 40, y: 60 }])
            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 80, y: 70 },])

            integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
            utility.longPress(integrationEnv, "#struct-view", 50, 50);
            utility.longPress(integrationEnv, "#struct-view", 100, 100);
            integrationEnv.d3.getCallbacks()['keyup']({ key: "s" });

            let model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getDimentions().length, 2);

            let ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.view-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(30, 30, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(30, 70, 1, 1)), "#ffffff");
        });
    });
});
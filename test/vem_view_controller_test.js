let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

describe('Test Main - Integration Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });


    describe('element drag/drop tests', function () {
        it('should update element vem positions', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 40, y: 80 },])
            let model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 1);

            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 80, y: 20 },])

            model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 1);
            assert.equal(model.getElements()[0].vemX, 70);
            assert.equal(model.getElements()[0].vemY, 10);
        });

        it('should merge elements vem positions', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 40, y: 80 },])
            utility.drawStroke(integrationEnv, [{ x: 60, y: 20 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 60, y: 80 },])
            let model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 2);

            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 80, y: 20 },])

            model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 1);
            assert.equal(model.getElements()[0].vemX, 80);
            assert.equal(model.getElements()[0].vemY, 10);
        });

        it('should draw a merged icon', function () {
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 42, y: 60 }, { x: 40, y: 80 },])
            utility.drawStroke(integrationEnv, [{ x: 20, y: 40 }, { x: 40, y: 42 }, { x: 60, y: 40 }, { x: 80, y: 45 },])
            let model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 2);

            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 80, y: 20 },])

            model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 1);

            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.view-canvas').getContext('2d');
            // check that the canvas drew something at 20, 20
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(109, 73, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(104, 12, 1, 1)), "#ffffff");
        });
    });

    describe('zoom tests', function () {
        it('should zoom the vem view', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 },])

            let model, ctx

            model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 1);

            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.view-canvas').getContext('2d');
            // check that the canvas drew something at 20, 20
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(9, 9, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(10, 10, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(42, 42, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(73, 73, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(74, 74, 1, 1)), "#000000");

            utility.pan(integrationEnv, "#vem-view", -20, -20)
            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.view-canvas').getContext('2d');
            // check that the canvas did not draw something at 20, 20, but did at 40, 40 now. 
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(20, 20, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(30, 30, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(62, 62, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(93, 93, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(94, 94, 1, 1)), "#000000");

            utility.zoom(integrationEnv, "#vem-view", { x: 62, y: 62 }, 0.5)
            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.view-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(45, 45, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(47, 47, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(62, 62, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(77, 77, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(79, 79, 1, 1)), "#000000");

        });
    });
});
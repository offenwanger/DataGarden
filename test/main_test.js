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

    describe('intialization test', function () {
        it('should be part of the enviroment', function () {
            assert(integrationEnv.main);
        });
    })

    describe('line drawing tests', function () {
        it('should highlight all three views when mousing over the stroke view', function () {
            // draw a line

            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 },])
            let model = integrationEnv.instances.ModelController.getModel();

            assert.equal(model.getGroups().length, 1);
            assert.equal(model.getElements().length, 1);
            assert.equal(model.getElements()[0].strokes.length, 1);
            expect(model.getElements()[0].strokes[0].path).to.eql([
                { "x": 5, "y": 5, },
                { "x": 5, "y": 5, },
                { "x": 5, "y": 25, },
                { "x": 5, "y": 45, },
                { "x": 5, "y": 65, }]);
        });
    })

    describe('highlight tests', function () {
        it('should highlight all three views when mousing over the stroke view', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 },])

            integrationEnv.d3.getCallbacks()['pointermove']({ clientX: 20, clientY: 30 });

            let model = integrationEnv.instances.ModelController.getModel();

            assert.equal(model.getGroups().length, 1);
            let group = model.getGroups()[0];

            let ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(group.structX, group.structY, 1, 1)), "#ff0000");

            assert.equal(model.getElements().length, 1);
            let element = model.getElements()[0];

            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(group.structX, group.structY, 1, 1)), "#ff0000");
        });

        it('should highlight all three views when mousing over the vem view', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 },])

            utility.pan(integrationEnv, "#vem-view", -20, -20)
            utility.zoom(integrationEnv, "#vem-view", { x: 20, y: 20 }, 2)
            utility.mouseOver(integrationEnv, "#vem-view", 50, 50);

            let model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 1);
            assert.equal(model.getGroups().length, 1);

            let ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(40, 40, 1, 1)), "#ff0000");

            let group = model.getGroups()[0];
            ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(group.structX, group.structY, 1, 1)), "#ff0000");
        });

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
    })
});
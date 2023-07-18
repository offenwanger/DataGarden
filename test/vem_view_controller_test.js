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


    describe('zoom tests', function () {
        it('should update element vem positions', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 40, y: 80 },])
            let model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 1);

            utility.drag(integrationEnv, PathUtil.translate([{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 80, y: 20 },], { x: 0, y: window.innerHeight / 2 }))

            model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 1);
            assert.equal(model.getElements()[0].vemX, 70);
            assert.equal(model.getElements()[0].vemY, 10);
        });
    });

    describe('zoom tests', function () {
        it('should zoom the vem view', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 },])

            let model, ctx

            model = integrationEnv.instances.ModelController.getModel();
            assert.equal(model.getElements().length, 1);

            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.view-canvas').getContext();
            // check that the canvas drew something at 20, 20
            assert.equal(ctx.array[9][9], "#00000000");
            assert.equal(ctx.array[10][10], "black");
            assert.equal(ctx.array[42][42], "#000000FF");
            assert.equal(ctx.array[73][73], "black");
            assert.equal(ctx.array[74][74], "#00000000");

            utility.pan(integrationEnv, "#vem-view", -20, -20)
            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.view-canvas').getContext();
            // check that the canvas did not draw something at 20, 20, but did at 40, 40 now. 
            assert.equal(ctx.array[20][20], "#00000000");
            assert.equal(ctx.array[30][30], "black");
            assert.equal(ctx.array[62][62], "#000000FF");
            assert.equal(ctx.array[93][93], "black");
            assert.equal(ctx.array[94][94], "#00000000");

            utility.zoom(integrationEnv, "#vem-view", { x: 62, y: 62 }, 0.5)
            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.view-canvas').getContext();
            assert.equal(ctx.array[50][50], "#00000000");
            assert.equal(ctx.array[51][51], "black");
            // this might indicate an error since it's not like the prev
            assert.equal(ctx.array[62][62], "black");
            assert.equal(ctx.array[92][92], "#000000FF");
            assert.equal(ctx.array[93][93], "#00000000");

        });
    });
});
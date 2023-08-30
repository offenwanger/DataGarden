let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

describe('Struct View Controller Test', function () {
    let integrationEnv;
    let model = function () { return integrationEnv.instances.ModelController.getModel(); }
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

            assert.equal(model().getElements().length, 2);
            assert.equal(model().getGroups().length, 1);

            let ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(30, 30, 1, 1)), "#ff0000");

            ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(30, 30, 1, 1)), "#ff0000");
        });
    });

    describe('drag/drop tests', () => {
        it('should update struct positions', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 40, y: 80 },])
            integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
            utility.longPress(integrationEnv, "#struct-view", 200, 200);
            integrationEnv.d3.getCallbacks()['keyup']({ key: "s" });
            assert.equal(model().getGroups().length, 1);
            assert.equal(model().getDimentions().length, 1);
            assert.equal(model().getDimentions()[0].structX, 200);
            assert.equal(model().getDimentions()[0].structY, 200);

            utility.drag(integrationEnv, "#struct-view", [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 80, y: 20 },])

            assert.equal(model().getGroups().length, 1);
            assert.equal(model().getGroups()[0].structX, 70);
            assert.equal(model().getGroups()[0].structY, 10);
            assert.equal(model().getDimentions().length, 1);
            assert.equal(model().getDimentions()[0].structX, 200);
            assert.equal(model().getDimentions()[0].structY, 200);

            utility.drag(integrationEnv, "#struct-view", [{ x: 210, y: 210 }, { x: 220, y: 200 }, { x: 250, y: 200 },])

            assert.equal(model().getDimentions().length, 1);
            assert.equal(model().getDimentions()[0].structX, 240);
            assert.equal(model().getDimentions()[0].structY, 190);
        });
    })

    describe('dimention tests', function () {
        it('should create a dimention', async function () {
            integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
            utility.longPress(integrationEnv, "#struct-view", 50, 50);
            utility.longPress(integrationEnv, "#struct-view", 25, 50);
            integrationEnv.d3.getCallbacks()['keyup']({ key: "s" });

            assert.equal(model().getDimentions().length, 2);

            let ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.view-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(30, 30, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(26, 51, 1, 1)), "#000000");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(51, 51, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(26, 100, 1, 1)), "#ffffff");
        });

        it('should create a dimention around groups', async function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 45, y: 40 }, { x: 40, y: 60 }])
            utility.drag(integrationEnv, "#struct-view", [{ x: 20, y: 20 }, { x: 80, y: 70 },])

            integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
            utility.longPress(integrationEnv, "#struct-view", 0, 0);
            utility.longPress(integrationEnv, "#struct-view", 150, 200);
            integrationEnv.d3.getCallbacks()['keyup']({ key: "s" });

            assert.equal(model().getDimentions().length, 2);

            let ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.view-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(80, 80, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(230, 210, 1, 1)), "#ffffff");
        });
    });


    describe('mapping tests', function () {
        it('should link number to cont', async function () {
            // each test needs to test a dimention without values and one with existing values
            assert.equal("unImplimented", false);
        });

        it('should link number to ord', async function () {
            assert.equal("unImplimented", false);
        });

        it('should link number to cat', async function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 45, y: 40 }, { x: 40, y: 60 }])
            integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
            utility.longPress(integrationEnv, "#struct-view", 150, 20);
            integrationEnv.d3.getCallbacks()['keyup']({ key: "s" });

            utility.drag(integrationEnv, "#struct-view", [{ x: 155, y: 30 }, { x: 200, y: 30 }, { x: 140, y: 110 }])

            assert.equal(model().getDimentions().length, 1);
            assert.equal(model().getDimentions()[0].levels.length, 2);
            assert.equal(model().getMappings().length, 1);
            assert.equal(model().getMappings()[0].links.length, 2);

            integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
            utility.longPress(integrationEnv, "#struct-view", 150, 120);
            integrationEnv.d3.getCallbacks()['keyup']({ key: "s" });

            utility.drag(integrationEnv, "#struct-view", [{ x: 155, y: 130 }, { x: 200, y: 30 }, { x: 140, y: 110 }])

            assert.equal(model().getMappings().length, 1);
            assert.equal(model().getDimentions().length, 2);
            assert.equal(model().getDimentions()[0].levels.length, 2);
            assert.equal(model().getDimentions()[1].levels.length, 2);
            assert.equal(model().getMappings().length, 1);
            assert.equal(model().getMappings()[0].links.length, 2);
            expect(model().getMappings()[0].links.map(l => l.elementId).sort())
                .to.eql(model().getElements().map(e => e.id).sort());
        });

        it('should link form to cont', async function () {
            assert.equal("unImplimented", false);
        });

        it('should link form to ord', async function () {
            assert.equal("unImplimented", false);
        });

        it('should link form to cat', async function () {
            assert.equal("unImplimented", false);
        });

        it('should link orientation to cont', async function () {
            assert.equal("unImplimented", false);
        });

        it('should link orientation to ord', async function () {
            assert.equal("unImplimented", false);
        });

        it('should link orientation to cat', async function () {
            assert.equal("unImplimented", false);
        });

        it('should link position to cont', async function () {
            assert.equal("unImplimented", false);
        });

        it('should link position to ord', async function () {
            assert.equal("unImplimented", false);
        });

        it('should link position to cat', async function () {
            assert.equal("unImplimented", false);
        });

        it('should replace existing mapping', async function () {
            assert.equal("unImplimented", false);
        });


    });
});
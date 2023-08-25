let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

describe('Vem View Controller Test', function () {
    let integrationEnv;
    let model = function () { return integrationEnv.instances.ModelController.getModel(); }
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
            assert.equal(model().getElements().length, 1);

            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 80, y: 20 },])

            assert.equal(model().getElements().length, 1);
            assert.equal(model().getElements()[0].vemX, 70);
            assert.equal(model().getElements()[0].vemY, 10);
        });

        it('should merge elements vem positions', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 40, y: 80 },])
            utility.drawStroke(integrationEnv, [{ x: 60, y: 20 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 60, y: 80 },])
            assert.equal(model().getElements().length, 2);

            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 80, y: 20 },])

            assert.equal(model().getElements().length, 1);
            assert.equal(model().getElements()[0].vemX, 80);
            assert.equal(model().getElements()[0].vemY, 10);
        });

        it('should draw a merged icon', function () {
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 42, y: 60 }, { x: 40, y: 80 },])
            utility.drawStroke(integrationEnv, [{ x: 20, y: 40 }, { x: 40, y: 42 }, { x: 60, y: 40 }, { x: 80, y: 45 },])
            assert.equal(model().getElements().length, 2);

            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 80, y: 20 },])

            assert.equal(model().getElements().length, 1);

            ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.view-canvas').getContext('2d');
            // check that the canvas drew something at 20, 20
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(109, 73, 1, 1)), "#ffffff");
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(104, 12, 1, 1)), "#ffffff");
        });

        it('should correctly update element parenting on merge', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 45, y: 40 }, { x: 40, y: 60 }])
            utility.drawStroke(integrationEnv, [{ x: 60, y: 20 }, { x: 55, y: 40 }, { x: 60, y: 60 }])
            assert.equal(model().getElements().length, 3);
            assert.equal(model().getGroups().length, 1);

            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 80, y: 70 },])
            utility.drag(integrationEnv, "#vem-view", [{ x: 180, y: 40 }, { x: 100, y: 160 },])

            assert.equal(model().getElements().length, 3);
            assert.equal(model().getGroups().length, 3);

            utility.drag(integrationEnv, "#vem-view", [{ x: 100, y: 140 }, { x: 100, y: 40 },])

            assert.equal(model().getElements().length, 2);
            assert.equal(model().getGroups().length, 2);
        });

        it('should break parenting loops', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 45, y: 40 }, { x: 40, y: 60 }])
            utility.drawStroke(integrationEnv, [{ x: 60, y: 20 }, { x: 55, y: 40 }, { x: 60, y: 60 }])
            assert.equal(model().getElements().length, 3);
            assert.equal(model().getGroups().length, 1);

            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 80, y: 70 },])
            utility.drag(integrationEnv, "#vem-view", [{ x: 180, y: 40 }, { x: 100, y: 160 },])

            assert.equal(model().getElements().length, 3);
            assert.equal(model().getGroups().length, 3);
            let parentElementId = model().getElements().find(e => !e.parentId).id;
            let firstChildId = model().getElements().find(e => e.parentId == parentElementId).id;
            let secondChildId = model().getElements().find(e => e.parentId == firstChildId).id;

            utility.drag(integrationEnv, "#vem-view", [{ x: 100, y: 140 }, { x: 100, y: 240 },]);

            assert.equal(model().getElements().length, 3);
            assert.equal(model().getGroups().length, 3);
            let newParentElementId = model().getElements().find(e => !e.parentId).id;
            let newFirstChildId = model().getElements().find(e => e.parentId == newParentElementId).id;
            let newSecondChildId = model().getElements().find(e => e.parentId == newFirstChildId).id;
            assert.equal(parentElementId, newParentElementId);
            assert.equal(newFirstChildId, secondChildId);
            assert.equal(newSecondChildId, firstChildId);
        });

        it('should set elements parent', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 40, y: 80 },])
            utility.drawStroke(integrationEnv, [{ x: 60, y: 20 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 60, y: 80 },])
            assert.equal(model().getElements().length, 2);
            assert.equal(model().getGroups().length, 1);

            utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 100, y: 60 },])

            assert.equal(model().getElements().length, 2);
            assert.equal(model().getGroups().length, 2);
            let parented = model().getElements().filter(e => e.parentId);
            let notParented = model().getElements().filter(e => !e.parentId);
            assert.equal(parented.length, 1);
            assert.equal(notParented.length, 1);
            assert.equal(parented[0].parentId, notParented[0].id);
            assert.equal(parented[0].vemY > notParented[0].vemY, true);

            parented = model().getGroups().filter(g => g.parentId);
            notParented = model().getGroups().filter(g => !g.parentId);
            assert.equal(parented.length, 1);
            assert.equal(notParented.length, 1);
            assert.equal(parented[0].parentId, notParented[0].id);
            assert.equal(parented[0].structY > notParented[0].structY, true);
        });
    });

    describe('zoom tests', function () {
        it('should zoom the vem view', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 },])

            assert.equal(model().getElements().length, 1);

            let ctx;
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

    describe("vem view highlight tests", function () {
        it('should highlight all three views when mousing over the vem view', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 },])

            utility.pan(integrationEnv, "#vem-view", -20, -20)
            utility.zoom(integrationEnv, "#vem-view", { x: 20, y: 20 }, 2)
            utility.mouseOver(integrationEnv, "#vem-view", 50, 50);

            assert.equal(model().getElements().length, 1);
            assert.equal(model().getGroups().length, 1);

            let ctx = d3.getRoot().select("#vem-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(40, 40, 1, 1)), "#ff0000");

            let group = model().getGroups()[0];
            ctx = d3.getRoot().select("#struct-view").select('.canvas-container').select('.interface-canvas').getContext('2d');
            assert.equal(DataUtil.imageDataToHex(ctx.getImageData(group.structX, group.structY, 1, 1)), "#ff0000");
        });
    })
});
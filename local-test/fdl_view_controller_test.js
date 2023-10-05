let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

describe('FDL View Controller Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    function model() {
        return integrationEnv.instances.ModelController.getModel();
    }

    describe('element merging test', function () {
        it('should merge two elements', function () {
            // draw a line

            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 40, y: 80 }])

            d3.tick();

            assert.equal(model().getGroups().length, 1);
            let elements = model().getElements();
            assert.equal(elements.length, 2);

            utility.clickMenuButton(integrationEnv, "#pause-button");
            utility.drag(integrationEnv, "#fdl-view", [d3.getPosition(elements[0].id), d3.getPosition(elements[1].id)])

            assert.equal(model().getElements().length, 1);
            assert.equal(model().getElements()[0].strokes.length, 2);
        });

        it('should explode merged element', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 40, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 40, y: 80 }])

            d3.tick();

            utility.clickMenuButton(integrationEnv, "#pause-button");
            let elements = model().getElements();
            utility.drag(integrationEnv, "#fdl-view", [d3.getPosition(elements[1].id), d3.getPosition(elements[0].id)])
            utility.drag(integrationEnv, "#fdl-view", [d3.getPosition(elements[2].id), d3.getPosition(elements[0].id)])

            d3.tick();

            assert.equal(model().getElements().length, 1);
            assert.equal(model().getElements()[0].strokes.length, 3);

            // dbl click
            utility.click(integrationEnv, "#fdl-view", d3.getPosition(elements[0].id));
            utility.click(integrationEnv, "#fdl-view", d3.getPosition(elements[0].id));

            d3.tick();

            let nodes = d3.getNodes();
            assert.equal(nodes.length, 3);
            expect(nodes.map(n => n.isStroke)).to.eql([true, true, true]);
        });
    })

    describe('element parenting test', function () {
        it('should parent two elements', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 40, y: 80 }])

            d3.tick();

            let elements = integrationEnv.instances.ModelController.getModel().getElements();
            utility.drag(integrationEnv, "#fdl-view", [d3.getLinkPosition(elements[0].id), d3.getPosition(elements[1].id)])

            utility.getCanvas('fdl', 'view').console.log();

            assert.equal(model().getElements().length, 2);
            expect(model().getElements().map(e => e.parentId ? true : false)).to.eql([false, true]);
        });

    })

    describe('highlight test', function () {
        it('should highlight strokes', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 10, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 30, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 50, y: 20 }, { x: 50, y: 40 }, { x: 50, y: 60 }, { x: 30, y: 80 }])

            d3.tick();

            utility.clickMenuButton(integrationEnv, "#pause-button");
            let elements = model().getElements();
            utility.drag(integrationEnv, "#fdl-view", [d3.getPosition(elements[1].id), d3.getPosition(elements[0].id)])

            d3.tick();

            let pos = d3.getPosition(model().getElements()[0].id);
            for (i = 20; i >= 0; i--) {
                utility.mouseOver(integrationEnv, "#fdl-view", { x: pos.x, y: pos.y - i });
            }

            // dbl click
            utility.click(integrationEnv, "#fdl-view", d3.getPosition(elements[0].id));
            utility.click(integrationEnv, "#fdl-view", d3.getPosition(elements[0].id));

            d3.tick();


            pos = d3.getPosition(model().getElements()[0].strokes[0].id);
            for (i = 20; i >= 0; i--) {
                utility.mouseOver(integrationEnv, "#fdl-view", { x: pos.x, y: pos.y - i });
            }

            let pixels = utility.getCanvas("stroke", 'interface').getContext("2d").getImageData(0, 0, 100, 100).data;
            assert.equal(pixels.some(v => v > 0), true);
        });

        it('should highlight linked link', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 40, y: 80 }])

            d3.tick();

            let elements = integrationEnv.instances.ModelController.getModel().getElements();
            utility.drag(integrationEnv, "#fdl-view", [d3.getLinkPosition(elements[0].id), d3.getPosition(elements[1].id)])

            d3.tick();

            assert.equal(model().getElements().length, 2);
            expect(model().getElements().map(e => e.parentId ? true : false)).to.eql([false, true]);

            // move the mouse away and check that there is no interface
            utility.mouseOver(integrationEnv, "#fdl-view", { x: 100, y: 100 });
            d3.tick();
            let pixels = utility.getCanvas("fdl", 'interface').getContext("2d").getImageData(0, 0, 100, 100).data;
            assert.equal(pixels.every(v => v == 0), true);

            // move the mouse over the parent triangle and check that it higlights
            let pos = d3.getLinkPosition(model().getElements().find(e => !e.parentId).id);
            for (i = 20; i >= 0; i--) {
                utility.mouseOver(integrationEnv, "#fdl-view", { x: pos.x, y: pos.y - i });
                d3.tick();
            }
            pixels = utility.getCanvas("fdl", 'interface').getContext("2d").getImageData(pos.x, pos.y, 1, 1).data;
            assert.equal(DataUtil.rgbToHex(pixels[0], pixels[1], pixels[2]), "#ff0000");

            // move the mouse over the child triangle and check that it higlights
            pos = d3.getLinkPosition(model().getElements().find(e => e.parentId).id);
            for (i = 20; i >= 0; i--) {
                utility.mouseOver(integrationEnv, "#fdl-view", { x: pos.x, y: pos.y - i });
                d3.tick();
            }

            pixels = utility.getCanvas("fdl", 'interface').getContext("2d").getImageData(pos.x, pos.y, 1, 1).data;
            assert.equal(DataUtil.rgbToHex(pixels[0], pixels[1], pixels[2]), "#ff0000");
        });

    })

    describe('grouping tests', function () {
        it('should create a new group for a stroke', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 10, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 30, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 50, y: 20 }, { x: 50, y: 40 }, { x: 50, y: 60 }, { x: 30, y: 80 }])

            d3.tick();

            utility.clickMenuButton(integrationEnv, "#pause-button");
            let elements = model().getElements();
            utility.drag(integrationEnv, "#fdl-view", [d3.getPosition(elements[1].id), d3.getPosition(elements[0].id)])

            utility.clickMenuButton(integrationEnv, "#pause-button");
            d3.tick();
            utility.clickMenuButton(integrationEnv, "#pause-button");

            assert.equal(model().getElements().length, 2);

            // dbl click
            utility.click(integrationEnv, "#fdl-view", d3.getPosition(elements[0].id));
            utility.click(integrationEnv, "#fdl-view", d3.getPosition(elements[0].id));

            utility.clickMenuButton(integrationEnv, "#pause-button");
            d3.tick();
            utility.clickMenuButton(integrationEnv, "#pause-button");

            utility.drag(integrationEnv, "#fdl-view", [d3.getPosition(model().getElements()[0].strokes[1].id), { x: 20, y: 20 }, { x: 100, y: 100 }])

            utility.clickMenuButton(integrationEnv, "#pause-button");
            d3.tick();
            utility.clickMenuButton(integrationEnv, "#pause-button");

            assert.equal(model().getGroups().length, 2);
            assert.equal(model().getElements().length, 3);
            expect(model().getElements().map(e => e.strokes.length)).to.eql([1, 1, 1]);
        })
    })

    describe('dimention editing tests', function () {
        it('should open the dimention edit view wihtout crashing', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 10, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 40, y: 20 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 30, y: 80 }])

            d3.tick();

            // dbl click
            let elements = model().getElements();
            let inBetweenNodes = MathUtil.average([
                d3.getPosition(elements[0].id),
                d3.getPosition(elements[1].id)
            ])
            utility.click(integrationEnv, "#fdl-view", inBetweenNodes);

            utility.clickContextMenuButton(integrationEnv, "#" + ContextButtons.ADD_DIMENTION_FOR_COLOR);

            d3.tick();

            assert.equal(model().getDimentions().length, 1)

            let dimention = model().getDimentions()[0];
            utility.click(integrationEnv, "#fdl-view", d3.getPosition(dimention.id));
            d3.tick(); // needed so that the interaction targets redraw
            utility.click(integrationEnv, "#fdl-view", d3.getPosition(dimention.id));
            d3.tick();

            assert.equal(model().getGroups().length, 1)
            assert.notEqual(model().getGroups()[0].colorMapping, null)
            assert.isTrue(IdUtil.isType(model().getGroups()[0].colorMapping.id, Data.Mapping))
        })
    })
});
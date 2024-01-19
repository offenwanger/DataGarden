import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js";
import * as utility from "./test_utils/utility.js";
import { ContextButtons } from '../local/js/constants.js';

describe('Canvas View Controller Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('line drawing tests', function () {
        it('should draw a stroke', function () {
            // draw a line
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])

            assert.equal(model().getElements().length, 1);
            assert.equal(model().getElements()[0].strokes.length, 1);
            // TODO, fix the thing where it's doubling the first point
            expect(model().getElements()[0].strokes[0].path).to.eql([{ x: 20, y: 20 }, { x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }]);
        });


    })

    describe('element merge tests', function () {
        it('should merge two elements', function () {
            utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke(integrationEnv, [{ x: 30, y: 20 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 30, y: 80 }])

            assert.equal(model().getElements().length, 2);
            expect(model().getElements().map(e => e.strokes.length)).to.eql([1, 1]);

            utility.drawSelection(integrationEnv, [{ x: 10, y: 10 }, { x: 10, y: 90 }, { x: 40, y: 90 }, { x: 40, y: 10 }]);
            utility.clickSelect(integrationEnv, "#canvas-view-container", { x: 20, y: 40 });
            utility.clickContextMenuButton(integrationEnv, "#" + ContextButtons.MERGE);

            // avoid double click
            Date.time = 1000;
            utility.click(integrationEnv, "#canvas-view-container", { x: 20, y: 40 })

            assert.equal(model().getElements().length, 1);
            expect(model().getElements().map(e => e.strokes.length)).to.eql([2]);
        });
    })
});
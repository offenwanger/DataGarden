let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

describe('Stroke View Controller Test', function () {
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
            let model = integrationEnv.instances.ModelController.getModel();

            assert.equal(model.getGroups().length, 1);
            assert.equal(model.getElements().length, 1);
            assert.equal(model.getElements()[0].strokes.length, 1);
            // TODO, fix the thing where it's doubling the first point
            expect(model.getElements()[0].strokes[0].path).to.eql([{ x: 20, y: 20 }, { x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }]);
        });
    })
});
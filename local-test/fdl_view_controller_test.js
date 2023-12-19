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

    describe('element parenting tests', function () {
        it('should parent two elements', function () {
            assert.equal('implimented', true)
        });

        it('should parent groups of elements', function () {
            assert.equal('implimented', true)
        });

        it('should prevent parenting loops', function () {
            assert.equal('implimented', true)
        });

        it('should parent elements via the bubble', function () {
            assert.equal('implimented', true)
        });

        it('should reparent on delete', function () {
            assert.equal('implimented', true)
        });
    })

    describe('deletion tests', function () {
        it('should delete a dimention', function () {
            assert.equal('implimented', true)
        });

        it('should delete a level', function () {
            assert.equal('implimented', true)
        });

        it('should delete a stroke', function () {
            assert.equal('implimented', true)
        });

        it('should delete an element', function () {
            assert.equal('implimented', true)
        });

        it('should delete a selection of everything', function () {
            assert.equal('implimented', true)
        });

        it('should only delete levels and dimensions when on an appropriate tab', function () {
            assert.equal('implimented', true)
        });
    })

    describe('dimention setting tests', function () {
        it('should create a dimention', function () {
            assert.equal('implimented', true)
        });

        it('should change dimention name', function () {
            assert.equal('implimented', true)
        });

        it('should change dimention type to continuous', function () {
            assert.equal('implimented', true)
        });

        it('should change dimention type to discrete', function () {
            assert.equal('implimented', true)
        });

        it('should change dimention channel to form', function () {
            assert.equal('implimented', true)
        });

        it('should change dimention channel to color', function () {
            assert.equal('implimented', true)
        });

        it('should change dimention channel to size', function () {
            assert.equal('implimented', true)
        });

        it('should change dimention channel to angle', function () {
            assert.equal('implimented', true)
        });

        it('should change dimention channel to dist', function () {
            assert.equal('implimented', true)
        });

        it('should change dimention type back and forth without losing old information', function () {
            assert.equal('implimented', true)
        });

        it('should create a level', function () {
            assert.equal('implimented', true)
        });

        it('should change a level name', function () {
            assert.equal('implimented', true)
        });

        it('should assign elements to level on drop', function () {
            assert.equal('implimented', true)
        });

        it('should change element assignment on drop', function () {
            assert.equal('implimented', true)
        });
    })
});
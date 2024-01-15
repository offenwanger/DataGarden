import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js"

describe('FDL View Controller Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

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
        it('should delete a dimension', function () {
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

    describe('dimension setting tests', function () {
        it('should create a dimension', function () {
            assert.equal('implimented', true)
        });

        it('should change dimension name', function () {
            assert.equal('implimented', true)
        });

        it('should change dimension type to continuous', function () {
            assert.equal('implimented', true)
        });

        it('should change dimension type to discrete', function () {
            assert.equal('implimented', true)
        });

        it('should change dimension channel to form', function () {
            assert.equal('implimented', true)
        });

        it('should change dimension channel to color', function () {
            assert.equal('implimented', true)
        });

        it('should change dimension channel to size', function () {
            assert.equal('implimented', true)
        });

        it('should change dimension channel to angle', function () {
            assert.equal('implimented', true)
        });

        it('should change dimension channel to dist', function () {
            assert.equal('implimented', true)
        });

        it('should change dimension type back and forth without losing old information', function () {
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
let chai = require('chai');
let assert = chai.assert;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/event_utility.js")

describe('Test Main - Integration Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        utility.DOMContentLoaded(integrationEnv);
    });

    afterEach(function (done) {
        suite.cleanup(done);
    });

    describe('intialization test', function () {
        it('should by part of the enviroment', function () {
            assert(integrationEnv.main);
        });
    })
});
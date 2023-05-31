let suite = require("./test_utils/suite_enviroment")

describe('Test Main - Integration Test', function () {
    afterEach(function (done) {
        suite.cleanup(done);
    });

    describe('intialization test', function () {
        it('should intialize', function () {
            suite.getIntegrationEnviroment();
        });
    })
});
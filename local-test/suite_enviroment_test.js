let suite = require("./test_utils/suite_enviroment")

describe('Suite Environment Test', function () {

    describe('intialization test', function () {
        it('should intialize', function (done) {
            suite.getIntegrationEnviroment().cleanup(done);
        });
    })
});
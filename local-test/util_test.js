let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

describe('Test Main - Integration Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('level tests', function () {
        it('should get 0 for a parentless element', function () {
            let model = utility.makeModel();
            assert.equal(DataUtil.getElementLevel(model.getElements().find(e => !e.parentId), model), 0);
        });

        it('should get more than 0 for a parented element', function () {
            let model = utility.makeModel();
            assert(DataUtil.getElementLevel(model.getElements().find(e => e.parentId), model) > 0);
        });

        it('should the right level for a deep element', function () {
            let model = utility.makeModel();
            expect(model.getElements().map(e => DataUtil.getElementLevel(e, model))).to.eql([0, 0, 0, 1, 1, 1, 1, 2, 2]);
        });
    })
});
let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

describe('EventManager Tests', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should be part of the enviroment', function () {
            assert.exists(EventManager);
        });

        it('should instantiate', function () {
            new EventManager();
        });
    })

    describe('window resize test', function () {
        it('should call the resize functions', function () {
            let called = [false, false, false, false];
            let eventManager = new EventManager({
                onResize: (w, h) => {
                    called[0] = true;
                    assert.equal(w, 500);
                    assert.equal(h, 400);
                }
            }, {
                onResize: (w, h) => {
                    called[1] = true;
                    assert.equal(w, 500);
                    assert.equal(h, 400);
                }
            }, {
                onResize: (w, h) => {
                    called[2] = true;
                    assert.equal(w, 500);
                    assert.equal(h, 400);
                }
            }, {
                onResize: (w, h) => {
                    called[3] = true;
                    assert.equal(w, 500);
                    assert.equal(h, 400);
                }
            });

            d3.getCallbacks()['resize']();

            assert.equal(true, called.every(t => t));
        });
    })
});
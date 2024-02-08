import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js"

import { Tab } from '../local/js/constants.js';

describe('Struct View Controller Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('generation tests', function () {
        it('should flip back and forth without error', async function () {
            await utility.uploadJSON('test.json');
            assert.equal(model().getDimensions().length, 6);
            utility.clickTab(Tab.TABLE);

            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
        });

        it('should generate a model for which the tables are the same', async function () {
            await utility.uploadJSON('test.json');
            assert.equal(model().getDimensions().length, 6);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));

            d3.select('#generate-button').getCallbacks()['click']()

            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);
            assert.equal('done', true);
        });
    })
});
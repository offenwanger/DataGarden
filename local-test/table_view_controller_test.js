import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js"

import { Tab } from '../local/js/constants.js';

describe('Table View Controller Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('supplimental id column tests', function () {
        it('should add a suplimentalId column for a dimen only defined by shape', async function () {
            await utility.uploadJSON('template_roses_shape.json');
            assert.equal(model().getTables().length, 1);
            assert.equal(model().getTables()[0].getColumns().length, 3);
        })

        it('should add a suplimentalId column for unmapped level', async function () {
            await utility.uploadJSON('template_roses_shape_1dimen.json');
            assert.equal(model().getTables().length, 1);
            assert.equal(model().getTables()[0].getColumns().length, 2);
        })
    })

    describe('generation tests', function () {
        it('should flip back and forth without error', async function () {
            await utility.uploadJSON('template_roses_full.json');
            assert.equal(model().getDimensions().length, 6);
            utility.clickTab(Tab.TABLE);

            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
        });

        it('should generate a model for which the tables are the same', async function () {
            await utility.uploadJSON('template_roses_full.json');
            assert.equal(model().getDimensions().length, 6);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));

            d3.select('#generate-button').getCallbacks()['click']()

            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);
            assert.equal('done', true);
        });
    })

    describe('shape generation tests', function () {
        it('should flip back and forth without error', async function () {
            await utility.uploadJSON('template_roses_shape.json');
            assert.equal(model().getDimensions().length, 2);
            utility.clickTab(Tab.TABLE);

            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
        });

        it('should generate a model for which the tables are the same', async function () {
            await utility.uploadJSON('template_roses_shape.json');
            assert.equal(model().getDimensions().length, 2);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));

            d3.select('#generate-button').getCallbacks()['click']()

            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);
        });

        it('should update a shape for a changed table', async function () {
            await utility.uploadJSON('template_roses_shape.json');
            assert.equal(model().getDimensions().length, 2);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));
            d3.select('#generate-button').getCallbacks()['click']()
            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);

            expect(model().getTables()[0].getDataArray()[1][2].value).to.eql("Via Text");
            utility.updateTable("#data-table-0", 1, 2, "In Person");
            expect(model().getTables()[0].getDataArray()[1][2].value).to.eql("In Person");
        });

        it('should generate a model for table with decorative elements', async function () {
            await utility.uploadJSON('template_thankyous_shape_only.json');
            assert.equal(model().getDimensions().length, 3);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));

            d3.select('#generate-button').getCallbacks()['click']()

            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);
        });

        it('should not crash for an invalid shape', async function () {
            await utility.uploadJSON('template_roses_shape.json');
            assert.equal(model().getDimensions().length, 2);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));
            d3.select('#generate-button').getCallbacks()['click']()
            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);

            expect(model().getTables()[0].getDataArray()[1][2].value).to.eql("Via Text");
            utility.updateTable("#data-table-0", 1, 2, "Blar");
        });
    })
});
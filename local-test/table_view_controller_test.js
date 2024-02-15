import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js"

import { Tab } from '../local/js/constants.js';
import { DataUtil } from '../local/js/utils/data_util.js';

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

        it('should generate a full model for which the tables are close enough', async function () {
            await utility.uploadJSON('template_roses_full.json');
            assert.equal(model().getDimensions().length, 6);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value).map(v => typeof v == 'number' ? Math.round(v) : v)));

            d3.select('#generate-button').getCallbacks()['click']()

            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value).map(v => typeof v == 'number' ? Math.round(v) : v)))).to.eql(tablesBefore);
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

    describe('color generation tests', function () {
        it('should flip back and forth without error', async function () {
            await utility.uploadJSON('template_roses_color.json');
            assert.equal(model().getDimensions().length, 1);
            utility.clickTab(Tab.TABLE);

            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
            d3.select('#generate-button').getCallbacks()['click']()
        });

        it('should generate a model for which the tables are the same', async function () {
            await utility.uploadJSON('template_roses_color.json');
            assert.equal(model().getDimensions().length, 1);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));

            d3.select('#generate-button').getCallbacks()['click']()

            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);
        });

        it('should update a color for a changed table', async function () {
            await utility.uploadJSON('template_roses_color.json');
            assert.equal(model().getDimensions().length, 1);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));
            d3.select('#generate-button').getCallbacks()['click']()
            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);

            let colorCounts = model().getElements().map(e => e.strokes.map(s => s.color).filter(c => DataUtil.hexToRGBA(c).a > 0)).flat()
                .reduce((totals, c) => {
                    if (!totals[c]) totals[c] = 0;
                    totals[c]++;
                    return totals;
                }, {});
            expect(colorCounts).to.eql({
                "#018c11ff": 8,
                "#0a8a05ff": 1,
                "#745149ff": 12,
                "#c7d279ff": 1,
                "#dbf492ff": 5,
                "#f31616ff": 8,
                "#ff0505ff": 3,
                "#ff1212ff": 6,
            });

            expect(model().getTables()[0].getDataArray()[1][1].value).to.eql("Bad");
            utility.updateTable("#data-table-0", 1, 1, "Good");
            expect(model().getTables()[0].getDataArray()[1][1].value).to.eql("Good");

            colorCounts = model().getElements().map(e => e.strokes.map(s => s.color).filter(c => DataUtil.hexToRGBA(c).a > 0))
                .flat()
                .reduce((totals, c) => {
                    if (!totals[c]) totals[c] = 0;
                    totals[c]++;
                    return totals;
                }, {});
            expect(colorCounts).to.eql({
                "#018c11ff": 8,
                "#0a8a05ff": 2,
                "#745149ff": 12,
                "#c7d279ff": 1,
                "#dbf492ff": 4,
                "#f31616ff": 8,
                "#ff0505ff": 3,
                "#ff1212ff": 6,
            });
        });

        it('should not crash for an invalid color', async function () {
            await utility.uploadJSON('template_roses_color.json');
            assert.equal(model().getDimensions().length, 1);
            utility.clickTab(Tab.TABLE);

            let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));
            d3.select('#generate-button').getCallbacks()['click']()
            expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);

            expect(model().getTables()[0].getDataArray()[1][1].value).to.eql("Bad");
            utility.updateTable("#data-table-0", 1, 1, "Blar");
        });

        describe('angle generation tests', function () {
            it('should flip back and forth without error', async function () {
                await utility.uploadJSON('template_roses_angle.json');
                assert.equal(model().getDimensions().length, 2);
                utility.clickTab(Tab.TABLE);

                d3.select('#generate-button').getCallbacks()['click']()
                d3.select('#generate-button').getCallbacks()['click']()
                d3.select('#generate-button').getCallbacks()['click']()
                d3.select('#generate-button').getCallbacks()['click']()

                await utility.uploadJSON('template_flowers_angle.json');
                assert.equal(model().getDimensions().length, 2);
                utility.clickTab(Tab.TABLE);

                d3.select('#generate-button').getCallbacks()['click']()
                d3.select('#generate-button').getCallbacks()['click']()
                d3.select('#generate-button').getCallbacks()['click']()
                d3.select('#generate-button').getCallbacks()['click']()
            });

            it('should generate a model for which the angles are the same', async function () {
                await utility.uploadJSON('template_roses_angle.json');
                assert.equal(model().getDimensions().length, 2);
                utility.clickTab(Tab.TABLE);

                let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));

                d3.select('#generate-button').getCallbacks()['click']()

                expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);
            });

            it('should update an angle for a changed table', async function () {
                await utility.uploadJSON('template_roses_angle.json');
                assert.equal(model().getDimensions().length, 2);
                utility.clickTab(Tab.TABLE);

                let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));
                d3.select('#generate-button').getCallbacks()['click']()
                expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);

                expect(model().getTables()[0].getDataArray()[1][1].value).to.eql("Right away");
                utility.updateTable("#data-table-0", 1, 1, "After a bit");
                expect(model().getTables()[0].getDataArray()[1][1].value).to.eql("After a bit");
            });

            it('should not crash for an invalid angle', async function () {
                await utility.uploadJSON('template_roses_angle.json');
                assert.equal(model().getDimensions().length, 2);
                utility.clickTab(Tab.TABLE);

                let tablesBefore = model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)));
                d3.select('#generate-button').getCallbacks()['click']()
                expect(model().getTables().map(t => t.getDataArray().map(r => r.map(c => c.value)))).to.eql(tablesBefore);

                expect(model().getTables()[0].getDataArray()[1][1].value).to.eql("Right away");
                utility.updateTable("#data-table-0", 1, 1, "Blar");
            });
        });
    });
});
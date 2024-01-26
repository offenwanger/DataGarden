import { ChannelType, DIMENSION_SETTINGS_HEIGHT, DimensionType, Size, Tab } from '../local/js/constants.js';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js"
import { DataUtil } from '../local/js/utils/data_util.js';

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
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)
        });

        it('should change dimension name', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 15, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.enterText("new name");
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].name, "new name");
        });

        it('should change dimension type to continuous', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.CONTINUOUS);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.CONTINUOUS);
        });

        it('should change dimension type to discrete', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.CONTINUOUS);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.CONTINUOUS);
            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.DISCRETE);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.DISCRETE);
        });

        it('should change dimension channel to form', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.COLOR);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.COLOR);
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.FORM);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.FORM);
        });

        it('should change dimension channel to color', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.COLOR);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.COLOR);
        });

        it('should change dimension channel to size', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.SIZE);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.SIZE);
        });

        it('should change dimension channel to angle', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.ANGLE);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.ANGLE);
        });

        it('should change dimension channel to dist, also make it valid', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.POSITION);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.POSITION);
            assert.equal(model().getDimensions()[0].tier, 0);

            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke([{ x: 20, y: 50 }, { x: 40, y: 55 }, { x: 50, y: 45 }, { x: 60, y: 50 }])

            assert.equal(model().getElements().length, 2);
            expect(model().getElements().map(e => e.strokes.length)).to.eql([1, 1]);
            expect(model().getElements().map(e => DataUtil.getTier(model(), e.id)).sort()).to.eql([0, 1]);

            utility.click('#fdl-view-container', { x: 285, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(1);

            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].tier, 1);
        });

        it('should change dimension type to cont and channel to size', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });

            utility.click('#fdl-view-container', { x: 180, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(DimensionType.CONTINUOUS);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].type, DimensionType.CONTINUOUS);

            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.POSITION);
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.POSITION);
        });

        it('should create a level', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)

            assert.equal(model().getDimensions()[0].levels.length, 0);
            utility.click('#fdl-view-container', { x: 15, y: DIMENSION_SETTINGS_HEIGHT + 60 });
            assert.equal(model().getDimensions()[0].levels.length, 1);
        });

        it('should change a level name', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)

            assert.equal(model().getDimensions()[0].levels.length, 0);
            utility.click('#fdl-view-container', { x: 15, y: DIMENSION_SETTINGS_HEIGHT + 60 });
            assert.equal(model().getDimensions()[0].levels.length, 1);

            utility.click('#fdl-view-container', { x: 15, y: 285 });
            utility.enterText("new name");
            assert.equal(model().getDimensions()[0].levels.length, 1);
            assert.equal(model().getDimensions()[0].levels[0].name, "new name");
        });

        it('should assign elements to level on drop', function () {
            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke([{ x: 30, y: 20 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 30, y: 80 }])

            assert.equal(model().getElements().length, 2);
            assert.equal(model().getElements()[0].strokes.length, 1);
            expect(model().getElements()[0].strokes[0].path).to.eql([{ x: 20, y: 20 }, { x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }]);

            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)
            for (let i = 0; i < 30; i++) d3.tick();

            utility.click('#fdl-view-container', { x: 15, y: 430 });
            assert.equal(model().getDimensions()[0].levels.length, 2);
            assert.equal(model().getDimensions()[0].levels[0].elementIds.length, 2);
            assert.equal(model().getDimensions()[0].levels[1].elementIds.length, 0);
            for (let i = 0; i < 30; i++) d3.tick();

            utility.drag('#fdl-view-container', [{ x: 475, y: 175 }, { x: 250, y: 200 }, { x: 300, y: 500 }]);

            assert.equal(model().getDimensions()[0].levels.length, 2);
            assert.equal(model().getDimensions()[0].levels[0].elementIds.length, 1);
            assert.equal(model().getDimensions()[0].levels[1].elementIds.length, 1);
        });

        it('should change dimension mapping on control drag', function () {
            utility.clickTab(Tab.LEGEND);
            assert.equal(model().getDimensions().length, 0);
            utility.click('#fdl-view-container', { x: 15, y: 15 });
            assert.equal(model().getDimensions().length, 1)
            for (let i = 0; i < 30; i++) d3.tick();

            utility.click('#fdl-view-container', { x: 15, y: 150 });
            for (let i = 0; i < 30; i++) d3.tick();
            utility.click('#fdl-view-container', { x: 15, y: 430 });
            for (let i = 0; i < 30; i++) d3.tick();
            assert.equal(model().getDimensions()[0].levels.length, 2);

            utility.drawStroke([{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 }])
            utility.drawStroke([{ x: 30, y: 20 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 30, y: 80 }])

            utility.click('#fdl-view-container', { x: 365, y: DIMENSION_SETTINGS_HEIGHT - 20 });
            utility.selectOption(ChannelType.SIZE);
            for (let i = 0; i < 30; i++) d3.tick();
            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].channel, ChannelType.SIZE);
            assert.equal(model().getDimensions()[0].ranges.length, 1)
            assert.equal(model().getDimensions()[0].ranges[0], 0.5)

            utility.drag('#fdl-view-container', [{ x: 183, y: 322 }, { x: 250, y: 200 }, { x: 300, y: 200 }]);

            assert.equal(model().getDimensions().length, 1)
            assert.equal(model().getDimensions()[0].ranges.length, 1)
            assert.equal(Math.round(model().getDimensions()[0].ranges[0] * 1000) / 1000, 0.18)
        });
    })
});
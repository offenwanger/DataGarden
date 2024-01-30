import { DataModel } from '../local/js/data_model.js';
import { Data } from '../local/js/data_structs.js';
import { IdUtil } from '../local/js/utils/id_util.js';
import { ChannelType, DimensionType } from '../local/js/constants.js';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js";

describe('Test Data Model', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should create a model', function () {
            let dataModel = new DataModel();
            expect(dataModel.getElements()).to.eql([]);
        });
    })

    describe('clone test', function () {
        it('should clone and be the same but a different object', function () {
            let dataModel = utility.makeModel();
            assert.exists(dataModel);

            let clone = dataModel.clone();
            utility.deepEquals(dataModel, clone);
            assert.notEqual(dataModel, clone);
        });
    })


    describe('get test', function () {
        it('should get element by id', function () {
            let dataModel = utility.makeModel();
            let elem = dataModel.getElements()[0];
            assert.equal(elem, dataModel.getElement(elem.id));
        });

        it('should get element by strokeId', function () {
            let dataModel = utility.makeModel();
            let elem = dataModel.getElements()[0];
            assert.equal(elem, dataModel.getElementForStroke(elem.strokes[0].id));
            assert.equal(elem, dataModel.getElementForStroke(elem.strokes[1].id));
            let elem2 = dataModel.getElements()[1];
            assert.equal(elem2, dataModel.getElementForStroke(elem2.strokes[0].id));
        });

        it('should get element by id', function () {
            let dataModel = utility.makeModel();
            let element = dataModel.getElements()[0];
            assert.equal(element, dataModel.getElement(element.id));
        });

        it('should return null for not found elements', function () {
            let dataModel = utility.makeModel();
            assert.equal(null, dataModel.getElement(IdUtil.getUniqueId(Data.Element)));
            assert.equal(null, dataModel.getElement(IdUtil.getUniqueId(Data.Element)));
            assert.equal(null, dataModel.getElementForStroke(IdUtil.getUniqueId(Data.Stroke)));
        });

    })

    describe("get children tests", function () {
        it('should get all decdendants and the item', function () {
            let dataModel = utility.makeModel();
            assert.equal(dataModel.getElements().length, 11)
            expect(dataModel.getElements().map(e => dataModel.getElementDecendants(e.id)).map(arr => arr.length).sort())
                .to.eql([1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 4]);
        });
    })

    describe("get table tests", function () {
        it('should a table from an empty model', function () {
            let dataModel = new DataModel();
            expect(dataModel.getTables()).to.eql([]);
        });

        it("should get a table one dimension and row", function () {
            let dataModel = new DataModel();
            for (let i = 0; i < 10; i++) {
                dataModel.getElements().push(new Data.Element());
                dataModel.getElements()[i].strokes.push(new Data.Stroke([{ x: 0, y: i * 10 }, { x: 10, y: i * 10 }], 3, "#000000"))
            }

            const levelName1 = "Name1";
            let elId1 = dataModel.getElements()[0].id;
            let elId2 = dataModel.getElements()[1].id;

            dataModel.getDimensions().push(new Data.Dimension());
            dataModel.getDimensions()[0].type = DimensionType.DISCRETE;
            dataModel.getDimensions()[0].channel = ChannelType.FORM;
            dataModel.getDimensions()[0].levels.push(new Data.Level());
            dataModel.getDimensions()[0].levels[0].name = levelName1;
            dataModel.getDimensions()[0].levels[0].elementIds = [elId1, elId2];

            dataModel.getDimensions().push(new Data.Dimension());
            dataModel.getDimensions()[1].type = DimensionType.DISCRETE;
            dataModel.getDimensions()[1].channel = ChannelType.COLOR;
            dataModel.getDimensions()[1].levels.push(new Data.Level());
            dataModel.getDimensions()[1].levels[0].name = "Name2";

            assert.equal(dataModel.getTables().length, 1);
            expect(dataModel.getTables()[0].getColumns().map(c => c.id)).to.eql([dataModel.getDimensions()[0].id]);
            expect(dataModel.getTables()[0].getDataArray().flat().map(c => c.value)).to.eql([levelName1, levelName1]);
            expect(dataModel.getTables()[0].getDataArray().flat().map(c => c.id).sort()).to.eql([elId1, elId2].sort());
        })

        it("should get a table with multiple rows and dimensions", function () {
            let dataModel = new DataModel();
            for (let i = 0; i < 10; i++) {
                dataModel.getElements().push(new Data.Element());
                dataModel.getElements()[i].strokes.push(new Data.Stroke([{ x: 0, y: i * 10 }, { x: 10, y: i * 10 }], 3, "#000000"))
            }
            for (let i = 5; i < 10; i++) {
                dataModel.getElements()[i].parentId = dataModel.getElements()[i - 5].id;
            }

            dataModel.getDimensions().push(new Data.Dimension());
            dataModel.getDimensions()[0].type = DimensionType.DISCRETE;
            dataModel.getDimensions()[0].channel = ChannelType.FORM;
            dataModel.getDimensions()[0].tier = 0;
            dataModel.getDimensions()[0].levels.push(new Data.Level());
            dataModel.getDimensions()[0].levels[0].name = "Level1";
            dataModel.getDimensions()[0].levels[0].elementIds
                .push(dataModel.getElements()[0].id, dataModel.getElements()[1].id, dataModel.getElements()[3].id);
            dataModel.getDimensions()[0].levels.push(new Data.Level());
            dataModel.getDimensions()[0].levels[1].name = "Level2";
            dataModel.getDimensions()[0].levels[1].elementIds
                .push(dataModel.getElements()[2].id, dataModel.getElements()[4].id);

            dataModel.getDimensions().push(new Data.Dimension());
            dataModel.getDimensions()[1].type = DimensionType.DISCRETE;
            dataModel.getDimensions()[1].channel = ChannelType.FORM;
            dataModel.getDimensions()[1].tier = 1;
            dataModel.getDimensions()[1].levels.push(new Data.Level());
            dataModel.getDimensions()[1].levels[0].name = "Level3";
            dataModel.getDimensions()[1].levels[0].elementIds
                .push(dataModel.getElements()[5].id, dataModel.getElements()[6].id, dataModel.getElements()[7].id);
            dataModel.getDimensions()[1].levels.push(new Data.Level());
            dataModel.getDimensions()[1].levels[1].name = "Level4";
            dataModel.getDimensions()[1].levels[1].elementIds
                .push(dataModel.getElements()[8].id, dataModel.getElements()[9].id);

            assert.equal(dataModel.getTables().length, 1);
            assert.equal(dataModel.getTables()[0].getColumns().length, 2);
            expect(dataModel.getTables()[0].getDataArray().map(r => r.map(c => c.value))).to.eql([
                ["Level1", "Level3"],
                ["Level1", "Level3"],
                ["Level2", "Level3"],
                ["Level1", "Level4"],
                ["Level2", "Level4"],
            ]);
        })

        it("should split separate tables", function () {
            let dataModel = new DataModel();
            for (let i = 0; i < 20; i++) {
                dataModel.getElements().push(new Data.Element());
                dataModel.getElements()[i].strokes.push(new Data.Stroke([{ x: 0, y: i * 10 }, { x: 10, y: i * 10 }], 3, "#000000"))
            }
            let elementsTiers = [[], []];
            for (let i = 10; i < 20; i++) {
                dataModel.getElements()[i].parentId = dataModel.getElements()[i - 10].id;
                elementsTiers[0].push(dataModel.getElements()[i - 10].id);
                elementsTiers[1].push(dataModel.getElements()[i].id);
            }


            for (let i = 0; i < 4; i++) {
                dataModel.getDimensions().push(new Data.Dimension());
                dataModel.getDimensions()[i].type = DimensionType.DISCRETE;
                dataModel.getDimensions()[i].channel = ChannelType.FORM;
                dataModel.getDimensions()[i].tier = i % 2;
                for (let j = 0; j < 2; j++) {
                    dataModel.getDimensions()[i].levels.push(new Data.Level());
                    dataModel.getDimensions()[i].levels[j].name = "Level" + (i * 10 + j);
                    for (let k = 0; k < 2; k++) {
                        dataModel.getDimensions()[i].levels[j].elementIds.push(elementsTiers[i % 2].pop());
                    }
                }
            }
            assert.equal(dataModel.getTables().length, 2);
        })
    })
});
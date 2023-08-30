let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

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
        it('should be part of the enviroment', function () {
            assert.exists(DataModel);
        });

        it('should create a model', function () {
            let dataModel = new DataModel();
            expect(dataModel.getGroups()).to.eql([]);
        });
    })

    describe('clone test', function () {
        it('should clone and be the same but a different object', function () {
            let dataModel = utility.makeModel(0);
            assert.exists(dataModel);

            let clone = dataModel.clone();
            utility.deepEquals(dataModel, clone);
            assert.notEqual(dataModel, clone);
        });
    })


    describe('get test', function () {
        it('should get element by id', function () {
            let dataModel = utility.makeModel(0);
            let elem = dataModel.getGroups()[0].elements[1];
            assert.equal(elem, dataModel.getElement(elem.id));
        });

        it('should get element by strokeId', function () {
            let dataModel = utility.makeModel(0);
            let elem = dataModel.getGroups()[0].elements[1];
            assert.equal(elem, dataModel.getElementForStroke(elem.strokes[0].id));
            assert.equal(elem, dataModel.getElementForStroke(elem.strokes[1].id));
            let elem2 = dataModel.getGroups()[1].elements[0];
            assert.equal(elem2, dataModel.getElementForStroke(elem2.strokes[0].id));
        });

        it('should get group by id', function () {
            let dataModel = utility.makeModel(0);
            let group = dataModel.getGroups()[0];
            assert.equal(group, dataModel.getGroup(group.id));
        });

        it('should get group by elementId', function () {
            let dataModel = utility.makeModel(0);
            let group = dataModel.getGroups()[0];
            assert.equal(group, dataModel.getGroupForElement(group.elements[0].id));
        });

        it('should return null for not found elements', function () {
            let dataModel = utility.makeModel(0);
            assert.equal(null, dataModel.getGroup(IdUtil.getUniqueId(Data.Group)));
            assert.equal(null, dataModel.getElement(IdUtil.getUniqueId(Data.Element)));
            assert.equal(null, dataModel.getElementForStroke(IdUtil.getUniqueId(Data.Stroke)));
        });

    })

    describe("get children tests", function () {
        it('should get all decdendants and the item', function () {
            let dataModel = utility.makeModel(1);
            assert.equal(dataModel.getElements().length, 9)
            expect(dataModel.getElements().map(e => dataModel.getElementDecendants(e.id)).map(arr => arr.length).sort())
                .to.eql([1, 1, 1, 1, 1, 1, 2, 2, 7]);
        });
    })
});
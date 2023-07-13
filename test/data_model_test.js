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
            let elem = dataModel.getGroups()[0].elements[1];
            assert.equal(elem, dataModel.getElement(elem.id));
        });

        it('should get element by strokeId', function () {
            let dataModel = utility.makeModel();
            let elem = dataModel.getGroups()[0].elements[1];
            assert.equal(elem, dataModel.getElementForStroke(elem.strokes[0].id));
            assert.equal(elem, dataModel.getElementForStroke(elem.strokes[1].id));
            let elem2 = dataModel.getGroups()[1].elements[0];
            assert.equal(elem2, dataModel.getElementForStroke(elem2.strokes[0].id));
        });

        it('should get group by id', function () {
            let dataModel = utility.makeModel();
            let group = dataModel.getGroups()[0];
            assert.equal(group, dataModel.getGroup(group.id));
        });

        it('should get group by elementId', function () {
            let dataModel = utility.makeModel();
            let group = dataModel.getGroups()[0];
            assert.equal(group, dataModel.getGroupForElement(group.elements[0].id));
        });

        it('should return null for not found elements', function () {
            let dataModel = utility.makeModel();
            assert.equal(null, dataModel.getGroup("badId"));
            assert.equal(null, dataModel.getElement("badId"));
            assert.equal(null, dataModel.getElementForStroke("badId"));
        });

    })
});
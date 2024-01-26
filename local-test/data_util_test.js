import { DataUtil } from '../local/js/utils/data_util.js';
import { Data } from '../local/js/data_structs.js';

import * as  chai from 'chai';
let assert = chai.assert;
let expect = chai.expect;

import * as suite from "./test_utils/suite_enviroment.js"
import * as utility from "./test_utils/utility.js"

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
            expect(model.getElements().map(e => DataUtil.getElementLevel(e, model))).to.eql([0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2]);
        });
    })


    describe('stupid spine tests', function () {
        it('should return stroke path spine for single stroke element', function () {
            let element = new Data.Element();
            element.strokes.push(new Data.Stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }], 1, "#00000000"));
            let spine = DataUtil.getStupidSpine(element);
            expect(spine).to.eql([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]);
        });

        it('should return spine for multi stroke element', function () {
            let element = new Data.Element();
            element.strokes.push(
                new Data.Stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }], 1, "#00000000"),
                new Data.Stroke([{ x: 2, y: 2 }, { x: 3, y: 3 }, { x: 1, y: 1 },], 1, "#00000000"),
                new Data.Stroke([{ x: 1, y: 1 }, { x: 3, y: 3 }, { x: 2, y: 2 }], 1, "#00000000")
            );
            let spine = DataUtil.getStupidSpine(element);
            spine.forEach(p => {
                p.x = Math.round(p.x * 100) / 100;
                p.y = Math.round(p.y * 100) / 100;
            });
            expect(spine).to.eql([{ x: 3, y: 3 }, { x: 2.14, y: 2.14 }, { x: 1.86, y: 1.86 }, { x: 1, y: 1 }]);
        });
    })
});
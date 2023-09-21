let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let suite = require("./test_utils/suite_enviroment")
let utility = require("./test_utils/utility.js")

describe('Struct View Controller Test', function () {
    let integrationEnv;
    let model = function () { return integrationEnv.instances.ModelController.getModel(); }
    beforeEach(function () {
        integrationEnv = suite.getIntegrationEnviroment();
        integrationEnv.documentLoad();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });


    // describe('table generation tests', function () {
    //     it('should create mappings and a table', function () {
    //         utility.drawStroke(integrationEnv, [{ x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 40, y: 80 },])
    //         utility.drawStroke(integrationEnv, [{ x: 60, y: 20 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 60, y: 80 },])
    //         assert.equal(model().getElements().length, 2);
    //         assert.equal(model().getGroups().length, 1);

    //         utility.drag(integrationEnv, "#vem-view", [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 60 }, { x: 100, y: 60 },])

    //         assert.equal(model().getElements().length, 2);
    //         assert.equal(model().getGroups().length, 2);

    //         integrationEnv.d3.getCallbacks()['keydown']({ key: "s" });
    //         utility.longPress(integrationEnv, "#struct-view", 150, 20);
    //         utility.longPress(integrationEnv, "#struct-view", 150, 120);
    //         integrationEnv.d3.getCallbacks()['keyup']({ key: "s" });
    //         utility.drag(integrationEnv, "#struct-view", [{ x: 155, y: 30 }, { x: 200, y: 30 }, { x: 140, y: 110 }])
    //         utility.drag(integrationEnv, "#struct-view", [{ x: 155, y: 130 }, { x: 200, y: 30 }, { x: 140, y: 250 }])
    //         assert.equal(model().getMappings().length, 2);

    //         assert.equal(model().getTables().length, 1);
    //         assert.equal(model().getTables()[0].length, 2);
    //         assert.equal(model().getTables()[0][0].length, 2);
    //         expect(model().getTables()[0][0].sort())
    //             .to.eql(model().getDimentions().map(d => d.name).sort())
    //         expect(model().getTables()[0][1].sort())
    //             .to.eql(model().getDimentions().map(d => d.levels[0].name).sort())

    //         let tables = jspreadsheet.getTables();
    //         assert.equal(tables.length, 1);
    //         assert.equal(tables[0].data.length, 1);
    //         expect(tables[0].data[0]).to.eql(["Level1", "Level1"]);
    //     });
    // });
});
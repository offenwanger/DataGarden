// This file defines the enviroment for tests.
// it's not actually a test it's just calling it test makes things easier. 


let fs = require('fs');
let vm = require('vm');
let rewire = require('rewire');
let rewireJs = function (name) { return rewire("../../js/" + name) }
let chai = require('chai')

let assert = chai.assert;

let mockD3 = require("./mock_d3.js");

let initialized = false;
let timeoutCallbacks = []

function init() {
    vm.runInThisContext(fs.readFileSync(__dirname + "/" + "../../js/constants.js"));

    // Trap error and trigger a failure. 
    let consoleError = console.error;
    console.error = function (message) {
        consoleError(...arguments);
        assert.fail("No Error", "Error: " + message);
    }

    // Overwrite the setTimeout function for manual control
    setTimeout = function (callback, delay) {
        timeoutCallbacks.push(callback);
    }

    global.document = {
        isDocument: true,
        addEventListener: function (event, callback) {
            if (event == 'DOMContentLoaded') {
                this.load = callback;
            } else {
                console.error("Shouldn't have any other events coming through here", event);
            }
        }
    }

    global.window = {
        isWindow: true,
        innerWidth: 1000,
        innerHeight: 800,
    }
}


function getIntegrationEnviroment() {
    // This gets run once and sets the constants.
    if (!initialized) { init(); initialized = true; }

    let main = rewireJs('main.js');

    // grab this immidiately because the next test will overwrite it. 
    // Yes, I know, this is bad programming, but I want my nice test 
    // coverage library so sue me. 
    let documentLoad = document.load;

    let instances = {};
    function snagConstructor(source, constructor) {
        return function () {
            instances[constructor] = source.__get__(constructor).call(this, ...arguments);
            return instances[constructor];
        }
    };

    let integrationEnv = {
        d3: new mockD3(),
        EventManager: rewireJs('event_manager.js').__get__("EventManager"),
        MenuController: rewireJs('menu_controller.js').__get__("MenuController"),
        ModelController: snagConstructor(rewireJs('model_controller.js'), "ModelController"),
        Data: rewireJs('data_structs.js').__get__("Data"),
        DataModel: rewireJs('data_model.js').__get__("DataModel"),
        ValUtil: rewireJs('util.js').__get__("ValUtil"),
        DataUtil: rewireJs('util.js').__get__("DataUtil"),
        PathUtil: rewireJs('util.js').__get__("PathUtil"),
        MathUtil: rewireJs('util.js').__get__("MathUtil"),
        IdUtil: rewireJs('util.js').__get__("IdUtil"),
        Fairies: rewireJs('fairy.js').__get__("Fairies"),
        StrokeViewController: rewireJs('views/stroke_view_controller.js').__get__("StrokeViewController"),
        VemViewController: rewireJs('views/vem_view_controller.js').__get__("VemViewController"),
        StructViewController: rewireJs('views/struct_view_controller.js').__get__("StructViewController"),
    };

    main.__set__(integrationEnv);
    integrationEnv.main = main;
    integrationEnv.documentLoad = documentLoad;
    integrationEnv.instances = instances;

    integrationEnv.cleanup = function (done) {
        Object.keys(integrationEnv).forEach((key) => {
            delete global[key];
        })
        triggerTimeouts();
        done();
    }

    return integrationEnv;
}

function triggerTimeouts() {
    timeoutCallbacks.forEach(callback => {
        callback();
    });
    timeoutCallbacks = [];
}

module.exports = {
    getIntegrationEnviroment,
    triggerTimeouts
}
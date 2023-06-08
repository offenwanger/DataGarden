// This file defines the enviroment for tests.
// it's not actually a test it's just calling it test makes things easier. 


let fs = require('fs');
let vm = require('vm');
let rewire = require('rewire');
let rewireJs = function (name) { return rewire("../../js/" + name) }
let chai = require('chai')

let assert = chai.assert;

let mockD3 = require("./mock_d3.js");
let mockJquery = require('./mock_jquery.js')

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
}

function createGlobalVariables() {
    let documentEventListeners = {};
    global.document = {
        addEventListener: function (event, callback) {
            documentEventListeners[event] ? 0 : documentEventListeners[event] = [];
            documentEventListeners[event].push(callback);
        }
    }

    let windowEventListeners = {};
    global.window = {
        // default values for window
        innerHeight: 800,
        innerWidth: 1000,
        addEventListener: function (event, callback) {
            documentEventListeners[event] ? 0 : documentEventListeners[event] = [];
            documentEventListeners[event].push(callback);
        }
    }

    return { documentEventListeners, windowEventListeners };
}

function createEnviromentVariables() {
    let d3 = new mockD3();
    let $ = new mockJquery();
    $.setDocument(global.document)

    return {
        d3,
        $,
        EventManager: rewireJs('interface/event_manager.js').__get__("EventManager"),
        MenuInterface: rewireJs('interface/menu_interface.js').__get__("MenuInterface"),
    };
}

function getIntegrationEnviroment() {
    let globalAccessors = createGlobalVariables();

    if (!initialized) { init(); initialized = true; }

    let main = rewireJs('main.js');
    main.__set__(createEnviromentVariables());

    return {
        globalAccessors,
        main
    };
}

function cleanup(done) {
    triggerTimeouts();
    delete global.document;
    done();
}

function triggerTimeouts() {
    timeoutCallbacks.forEach(callback => {
        callback();
    });
    timeoutCallbacks = [];
}

module.exports = {
    getIntegrationEnviroment,
    cleanup,
    triggerTimeouts
}
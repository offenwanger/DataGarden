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
}

function createGlobalVariables() {
    let documentEventListeners = {};
    global.document = {
        addEventListener: function (event, callback) {
            documentEventListeners[event] ? 0 : documentEventListeners[event] = [];
            documentEventListeners[event].push(callback);
        }
    }

    return { documentEventListeners };
}

function createEnviromentVariables() {
    let d3 = new mockD3();
    let window = {
        // default values for window
        innerHeight: 800,
        innerWidth: 1000
    };

    return { d3, window };
}

function getIntegrationEnviroment() {
    let globals = createGlobalVariables();

    if (!initialized) { init(); initialized = true; }

    let main = rewireJs('main.js');
    main.__set__(createEnviromentVariables());

    return {
        globals,
        main,
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
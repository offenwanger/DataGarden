// This file defines the enviroment for tests.
// it's not actually a test it's just calling it test makes things easier. 

import chai from 'chai'

let assert = chai.assert;

import { resetGlobals } from './setup_globals.js'

import * as main from '../../local/js/main.js'

export function getIntegrationEnviroment() {
    let documentLoad = document.load;

    let instances = {};
    function snagConstructor(source, constructor) {
        return function () {
            instances[constructor] = source.__get__(constructor).call(this, ...arguments);
            return instances[constructor];
        }
    };

    let integrationEnv = {};

    integrationEnv.main = main;
    integrationEnv.documentLoad = documentLoad;
    integrationEnv.instances = instances;

    integrationEnv.clearTimeouts = function () {
        global.timeouts.forEach(callback => {
            if (callback) callback();
        });
        global.timeouts = [];
    }

    integrationEnv.cleanup = function (done) {
        this.clearTimeouts();
        Object.keys(integrationEnv).forEach((key) => {
            delete global[key];
        });
        resetGlobals();
        done();
    }

    return integrationEnv;
}
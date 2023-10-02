// This file defines the enviroment for tests.
// it's not actually a test it's just calling it test makes things easier. 


let fs = require('fs');
let vm = require('vm');
let rewire = require('rewire');
let rewireJs = function (name) { return rewire("../../local/js/" + name) }
let chai = require('chai')

let assert = chai.assert;

let mockD3 = require("./mock_d3.js");
let mockJspreadsheet = require("./mock_jspreadsheet.js");
let mockServer = require("./mock_server.js");
let mockPicker = require("./mock_color_picker.js");
let mockDate = require("./mock_date.js");

let initialized = false;

function init() {
    vm.runInThisContext(fs.readFileSync(__dirname + "/" + "../../local/js/constants.js"));

    // Trap error and trigger a failure. 
    let consoleError = console.error;
    console.error = function (message) {
        consoleError(...arguments);
        assert.equal("No Error", "Error: " + message);
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

    global.Date = new mockDate();

    global.timeouts = [];
    global.setTimeout = function (callback, delay) {
        global.timeouts.push(callback);
        return global.timeouts.length - 1;
    }

    global.clearTimeout = function (index = null) {
        if (index || index == 0) global.timeouts[index] = null;
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

    let server = new mockServer();
    let jspreadsheet = new mockJspreadsheet();
    let integrationEnv = {
        d3: new mockD3(jspreadsheet),
        server: server,
        fetch: () => server.fetch(...arguments),
        jspreadsheet,
        Picker: mockPicker,
        EventManager: rewireJs('event_manager.js').__get__("EventManager"),
        MenuController: rewireJs('menu/menu_controller.js').__get__("MenuController"),
        RadialContextMenu: rewireJs('menu/radial_context_menu.js').__get__("RadialContextMenu"),
        MenuButton: rewireJs('menu/menu_button.js').__get__("MenuButton"),
        ToolTip: rewireJs('menu/tooltip.js').__get__("ToolTip"),
        VersionController: rewireJs('version_controller.js').__get__("VersionController"),
        MemoryStash: rewireJs('version_controller.js').__get__("MemoryStash"),
        ModelController: snagConstructor(rewireJs('model_controller.js'), "ModelController"),
        Data: rewireJs('data_structs.js').__get__("Data"),
        DataModel: rewireJs('data_model.js').__get__("DataModel"),
        ValUtil: rewireJs('utils/value_util.js').__get__("ValUtil"),
        DataUtil: rewireJs('utils/data_util.js').__get__("DataUtil"),
        PathUtil: rewireJs('utils/path_util.js').__get__("PathUtil"),
        MathUtil: rewireJs('utils/math_util.js').__get__("MathUtil"),
        ModelUtil: rewireJs('utils/model_util.js').__get__("ModelUtil"),
        IdUtil: rewireJs('utils/id_util.js').__get__("IdUtil"),
        DrawingUtil: rewireJs('utils/drawing_util.js').__get__("DrawingUtil"),
        FiltersUtil: rewireJs('utils/filters_util.js').__get__("FiltersUtil"),
        ServerRequestUtil: rewireJs('utils/server_request_util.js').__get__("ServerRequestUtil"),
        StrokeViewController: rewireJs('views/stroke_view_controller.js').__get__("StrokeViewController"),
        FdlViewController: rewireJs('views/fdl_view_controller.js').__get__("FdlViewController"),
    };

    main.__set__(integrationEnv);
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
        })
        done();
    }

    return integrationEnv;
}

module.exports = {
    getIntegrationEnviroment,
}
import * as mockCanvas from "./mock_canvas.js"
import { mockDate } from "./mock_date.js"
import { mockD3 } from "./mock_d3.js";
import { mockJspreadsheet } from "./mock_jspreadsheet.js"
import { mockServer } from "./mock_server.js"
import { mockPicker } from "./mock_color_picker.js"

import { DataModel } from "../../local/js/data_model.js";

// this must import before main so that the document is set.

import * as  chai from 'chai';
let assert = chai.assert;

global.document = {
    isDocument: true,
    addEventListener: function (event, callback) {
        if (event == 'DOMContentLoaded') {
            global.document.load = callback;
        } else {
            console.error("Shouldn't have any other events coming through here", event);
        }
    },
    createElement(tag) {
        if (tag == 'canvas') {
            return mockCanvas.createCanvas();
        } if (tag == 'a') {
            return { click: () => { } };
        } else if (tag == 'http://www.w3.org/2000/svg') {
            console.error("impliment me!");
        } else {
            console.error("Type not supported!")
        }
    }
}

// Trap error and trigger a failure. 
let consoleError = console.error;
console.error = function (message) {
    consoleError(...arguments);
    assert.equal("No Error", "Error: " + message);
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
global.Image = function () { return createCanvas(10, 10) };
global.server = new mockServer();
global.fetch = () => global.server.fetch(...arguments);
global.Picker = mockPicker;

global.Blob = function (data) {
    global.blobs.push(data[0]);
}
global.blobs = [];
// Prevent lack of blob errors
global.URL = {
    createObjectURL: () => { },
    revokeObjectURL: () => { },
}
global.model = function () {
    let blobLength = global.blobs.length;
    let downloadButton = global.d3.select("#download-button");
    if (!downloadButton) {
        console.error("No download button found!");
        return null;
    }
    downloadButton.select('rect').getCallbacks()['pointerup']({ stopPropagation: () => { } });
    if (global.blobs.length != blobLength + 1) {
        console.error("Model fetch failed!");
    }
    return DataModel.fromObject(JSON.parse(global.blobs[blobLength]));
}

global.jspreadsheet = new mockJspreadsheet()
global.d3 = new mockD3(jspreadsheet);

export function resetGlobals() {
    global.jspreadsheet = new mockJspreadsheet()
    global.d3 = new mockD3(jspreadsheet);
}
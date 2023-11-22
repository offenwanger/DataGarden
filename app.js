'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const utility = require('./server/utility.js');
const fileHandler = require('./server/file_handler.js');
const cppConnector = require('./server/cpp_connector.js');
const config = require("./app_config.js");

const app = express();
// Required to send and recieve JSON
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));

let mIdMap = new utility.IdMap();

utility.log("************* Starting the server *************")

const port = 3333;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/local/app.html');
});

// Everything in the local folder can be accessed via /filename
app.use('/', express.static(__dirname + '/local'));

/************************
 *  Fairy module requests  *
 ************************/
app.post('/getspine', function (req, res) {
    let element = req.body;
    if (!element.strokes) {
        res.status(400).send("Error! Invalid element provided!");
        return;
    }

    let scap = utility.elementToSpineScap(element);
    let filename = element.id + ".scap";
    let outFoldername = element.id;
    let outFile = outFoldername + "/" + element.id + "_fit.scap";

    fileHandler.writeScap(filename, scap)
        .then(() => fileHandler.createScapOutFolder(outFoldername))
        .then(() => cppConnector.runStrokeStrip(filename, outFoldername))
        .then(() => fileHandler.readOutput(outFile))
        .then(outScap => {
            let path = utility.scapToPath(outScap, utility.elementTopCorner(element));
            res.status(200).send(path);
        }).catch(error => {
            console.error(error);
            res.status(500).send();
        }).then(() => {
            if (!config.DEBUG) {
                fileHandler.deleteScap(filename);
                fileHandler.deleteScapOutFolder(outFoldername);
            }
        });
});

app.post('/suggestMerge', function (req, res) {
    utility.log("Merge request recieved, starting processing.")
    if (!req.body.elements) {
        res.status(400).send("Error! Elements not provided!");
        return;
    }

    let scap = utility.elementsToScap(req.body.elements, mIdMap);
    let label = "elements" + req.body.elements.length + "_" + Date.now();
    let filename = label + ".scap";
    let outFilename = label + "_out.scap"
    fileHandler.writeScap(filename, scap)
        .then(() => cppConnector.runStripMaker(filename))
        .then(() => {
            // try to read the result, see if it's any good. 
            return fileHandler.readOutput(outFilename);
        }).then(outScap => {
            let result = utility.scapToMerge(outScap, mIdMap);
            res.status(200).json(result);
        }).catch(error => {
            console.error(error);
            res.status(500).send();
        }).then(() => {
            if (!config.DEBUG) {
                fileHandler.deleteScap(filename);
                fileHandler.deleteScap(outFilename);
            }
        });
});

// Start the application
app.listen(port);

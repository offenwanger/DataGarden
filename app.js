'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const utility = require('./server/utility.js');
const fileHandler = require('./server/file_handler.js');
const cppConnector = require('./server/cpp_connector.js');
const { util } = require('chai');

const app = express();
// Required to send and recieve JSON
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));

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

    let scap = utility.elementToScap(element);
    let filename = element.id + ".scap";
    let outFilename = element.id + "_out.scap";
    fileHandler.writeScap(filename, scap);
    cppConnector.runStrokeStrip(filename, outFilename).then(() => {
        // try to read the result, see if it's any good. 
        return fileHandler.readScap(outFilename);
    }).then(outScap => {
        let path = utility.scapToPath(outScap)
        res.status(200).send(path);
    }).catch(error => {
        res.status(500).send();
    });
});

// Start the application
app.listen(port);

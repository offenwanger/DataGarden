const { spawn } = require('child_process');
const utility = require("./utility.js");

function runStrokeStrip(scapFilename, outname) {
    return new Promise(resolve => {
        let command = "strokestrip";

        utility.log("Spinning up strokestrip");
        try {
            const cpp = spawn(command, ['param1', scapFilename, outname], { cwd: __dirname });

            // collect output from console
            cpp.stdout.on('data', function (data) {
                text = data.toString();
                lines = text.split(/\r?\n/)
                lines.forEach(line => {
                    utility.log(line);
                })
            });

            // collect the error messages
            cpp.stderr.on('data', function (data) {
                utility.log("cpp script encountered an error: ");
                utility.log(data.toString());
            })

            // all done, return value. 
            cpp.on('close', (code) => {
                utility.log("Strokestrip script completed with exit code " + code);
                resolve();
            });

            cpp.on("error", function (error) {
                console.error(error)
            })

            cpp.on("exit", function () {
                resolve();
            })
        } catch (e) {
            console.error(e);
            resolve();
        }
    })
}

module.exports = {
    runStrokeStrip,
}
const { spawn } = require('child_process');
const utility = require("./utility.js");
const config = require("../app_config.js");

function runStrokeStrip(scapFilename, outFolder) {
    return new Promise((resolve) => {
        utility.log("Spinning up StrokeStrip");
        try {
            const cpp = spawn(config.STROKE_STRIP_EXE, ["-i", __dirname + "/scaps/" + scapFilename, "-o", __dirname + "/scaps/" + outFolder + "/"]);

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
                utility.log("Strokestrip finished.")
                resolve();
            })
        } catch (e) {
            console.error(e);
            resolve();
        }
    })
}

function runStripMaker(scapFilename) {
    return mStreamPromise.then(new Promise(resolve => {
        utility.log("Steaming " + scapFilename);
        try {
            const cpp = spawn(config.STRIP_MAKER_EXE, ["-i", __dirname + "/scaps/" + scapFilename, "-o", __dirname + "/scaps"]);

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
                utility.log("StripMaker script completed with exit code " + code);
                resolve();
            });

            cpp.on("error", function (error) {
                console.error(error)
            })

            cpp.on("exit", function () {
                resolve();
                utility.log("StripMaker finished.")
            })
        } catch (e) {
            console.error(e);
            resolve();
        }
    }));
}

let mStreamQueue = [];
let mStreamIdle = true;
let mStreamProcess = null;

function runStripStream(scapFilename) {
    let resolver;
    let promise = new Promise(resolve => { resolver = resolve; });
    try {
        if (!mStreamProcess) {
            mStreamProcess = startStream();
        }

        mStreamQueue.push({ scapFilename, resolve: resolver })
        if (mStreamIdle) {
            utility.log("Streaming " + scapFilename);
            mStreamProcess.stdin.write(scapFilename + "\n");
            mStreamIdle = false;
        }
    } catch (e) {
        console.error(e);
    }

    return promise;
}

function startStream() {
    let cpp = spawn(config.STRIP_STREAM_EXE, ["--input", __dirname + "/scaps", "--output", __dirname + "/scaps/out"]);

    // collect output from console
    cpp.stdout.on('data', function (data) {
        text = data.toString();
        lines = text.split(/\r?\n/)
        lines.forEach(line => {

            utility.log(line);
            if (line.split(" ")[1] == "time:") {
                console.log("finished " + line.split(" ")[0])
                let next = mStreamQueue.shift();
                if (mStreamQueue.length == 0) {
                    mStreamIdle = true;
                    console.log("Stream idle.")
                } else {
                    utility.log("Streaming " + mStreamQueue[0].scapFilename);
                    cpp.stdin.write(mStreamQueue[0].scapFilename + "\n");
                }
                next.resolve();
            }
        })
    });

    // collect the error messages
    cpp.stderr.on('data', function (data) {
        utility.log("cpp script encountered an error: ");
        utility.log(data.toString());
    })

    // all done, return value. 
    cpp.on('close', (code) => {
        utility.log("StripSteam script completed??? with exit code " + code);
        resolve();
    });

    cpp.on("error", function (error) {
        console.error(error)
    })

    cpp.on("exit", function () {
        resolve();
        utility.log("StripSteam finished???")
    })

    return cpp;
}


module.exports = {
    runStrokeStrip,
    runStripMaker,
    runStripStream,
}
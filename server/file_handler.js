const fs = require('fs');

const SCAP_FOLDER = __dirname + '/scaps/'

async function writeScap(filename, contents) {
    try {
        fs.writeFileSync(SCAP_FOLDER + filename, contents, err => err ? console.error(err) : null);
    } catch (e) {
        console.error(e);
    }
}

async function readOutput(filename) {
    try {
        return fs.readFileSync(SCAP_FOLDER + filename, 'utf8');
    } catch (e) {
        console.error(e);
        return "";
    }
}

async function deleteScap(filename) {
    try {
        fs.unlinkSync(SCAP_FOLDER + filename, 'utf8');
    } catch (e) {
        console.error(e);
    }
}

async function createScapOutFolder(folderName) {
    try {
        if (!fs.existsSync(SCAP_FOLDER + folderName)) {
            fs.mkdirSync(SCAP_FOLDER + folderName);
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteScapOutFolder(folderName) {
    try {
        fs.rmSync(SCAP_FOLDER + folderName, { recursive: true, force: true });
    } catch (e) {
        console.error(e);
    }
}

module.exports = {
    writeScap,
    readOutput,
    deleteScap,
    createScapOutFolder,
    deleteScapOutFolder,
}
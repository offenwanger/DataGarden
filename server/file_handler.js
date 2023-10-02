const fs = require('fs');

const SCAP_FOLDER = __dirname + '/scaps/'

async function writeScap(filename, contents) {
    try {
        fs.writeFileSync(SCAP_FOLDER + filename, contents, err => err ? console.error(err) : null);
    } catch (e) {
        console.error(e);
    }
}

async function readScap(filename) {
    try {
        return fs.readFileSync(SCAP_FOLDER + filename, 'utf8');
    } catch (e) {
        console.error(e);
        return "";
    }
}

async function deleteScap(filename) {
    try {
        return fs.unlinkSync(SCAP_FOLDER + filename, 'utf8');
    } catch (e) {
        console.error(e);
        return null;
    }
}

module.exports = {
    writeScap,
    readScap,
    deleteScap,
}
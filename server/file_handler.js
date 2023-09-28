const fs = require('fs');

const SCAP_FOLDER = __dirname + '/scaps/'

async function writeScap(filename, contents) {
    fs.writeFileSync(SCAP_FOLDER + filename, contents, err => err ? console.error(err) : null);
}

async function readScap(filename) {
    return fs.readFileSync(SCAP_FOLDER + filename, 'utf8');
}

async function deleteScap(filename) {
    return fs.unlinkSync(SCAP_FOLDER + filename, 'utf8');
}

module.exports = {
    writeScap,
    readScap,
    deleteScap,
}
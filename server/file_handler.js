const fs = require('fs');

const SCAP_FOLDER = __dirname + '/scaps/'

function writeScap(filename, contents) {
    fs.writeFile(SCAP_FOLDER + filename, contents, err => err ? console.error(err) : null);
}

async function readScap(filename) {
    return fs.readFileSync(SCAP_FOLDER + filename, 'utf8');
}

module.exports = {
    writeScap,
    readScap,
}
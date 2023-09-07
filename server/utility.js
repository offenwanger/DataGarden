function elementToScap(element) {
    let scap = "";

    let width = Math.max(...element.strokes.map(s => s.path.map(p => p.x)).flat());
    let height = Math.max(...element.strokes.map(s => s.path.map(p => p.y)).flat());
    let size = element.strokes.map(s => s.size).reduce((a, b) => a + b, 0) / element.strokes.length;

    scap += "#" + width + "\t" + height + "\n";
    scap += "@" + size + "\n";

    element.strokes.forEach((stroke, index) => {
        scap += "{\n";
        scap += "\t#" + index + "\t" + 0 + "\n";
        stroke.path.forEach(p => {
            scap += "\t" + p.x + "\t" + p.y + "\t0\n";
        })
        scap += "}\n";
    })
    return scap;
}

function scapToPath(scap) {
    let lines = scap.split("{")[1].split("}")[0].split("\n");
    return lines.slice(1, lines.length).map(line => {
        let x = line.split("\t")[1];
        let y = line.split("\t")[2];
        return { x: parseFloat(x), y: parseFloat(y) };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y));
}

function log() {
    console.log(...arguments);
}

module.exports = {
    elementToScap,
    scapToPath,
    log,
}
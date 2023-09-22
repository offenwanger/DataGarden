function elementToScap(element, idMap) {
    let scap = "";

    let width = Math.max(...element.strokes.map(s => s.path.map(p => p.x)).flat());
    let height = Math.max(...element.strokes.map(s => s.path.map(p => p.y)).flat());
    let size = element.strokes.map(s => s.size).reduce((a, b) => a + b, 0) / element.strokes.length;

    scap += "#" + width + "\t" + height + "\n";
    scap += "@" + size + "\n";

    element.strokes.forEach(stroke => {
        scap += "{\n";
        scap += "\t#" + idMap.getMapping(stroke.id) + "\t" + idMap.getMapping(element.id) + "\n";
        stroke.path.forEach(p => {
            scap += "\t" + p.x + "\t" + p.y + "\t0\n";
        })
        scap += "}\n";
    })
    return scap;
}

function elementsToScap(elements, idMap) {
    let strokes = elements.map(e => e.strokes).flat();
    let width = Math.max(...strokes.map(s => s.path.map(p => p.x)).flat());
    let height = Math.max(...strokes.map(s => s.path.map(p => p.y)).flat());
    let size = strokes.map(s => s.size).reduce((a, b) => a + b, 0) / strokes.length;
    let data = elements.map(e => e.strokes.map(s => {
        return {
            elementId: e.id,
            strokeId: s.id,
            path: s.path,
            creationTime: s.creationTime,
        }
    })).flat().sort((a, b) => a.creationTime - b.creationTime);

    let scap = "";
    scap += "#" + width + "\t" + height + "\n";
    scap += "@" + size + "\n";

    data.forEach(item => {
        scap += "{\n";
        scap += "\t#" + idMap.getMapping(item.strokeId) + "\t" + idMap.getMapping(item.elementId) + "\n";
        item.path.forEach(p => {
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

function scapToGrouping(scap, idMap) {
    let tags = scap.split("{\r\n").slice(1).map(stroke => {
        return stroke.split("\r\n")[0].split("\t").slice(1);
    })
    let groups = {};
    tags.forEach(tag => {
        if (!groups[tag[1]]) groups[tag[1]] = [];
        groups[tag[1]].push(idMap.getId(tag[0].substring(1)))
    })
    return Object.values(groups);
}

function log() {
    console.log(...arguments);
}

function IdMap() {
    let counter = 0;
    let map = {};
    let reverseMap = {};
    this.getMapping = function (id) {
        if (!map[id]) {
            let mapping = counter++
            map[id] = mapping;
            reverseMap[mapping] = id;
        }
        return map[id];
    }
    this.getId = function (mapping) {
        return reverseMap[mapping];
    }
}

module.exports = {
    elementToScap,
    elementsToScap,
    scapToPath,
    scapToGrouping,
    IdMap,
    log,
}
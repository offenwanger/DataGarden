let ValUtil = function () {
    function checkConvertionState(coords, boundingBox, zoomPan) {
        if (isNaN(parseInt(coords.x)) || isNaN(parseInt(coords.y))) {
            console.error('Bad conversion coords', coords);
            return false;
        }

        if (isNaN(parseInt(boundingBox.x)) || isNaN(parseInt(boundingBox.y))) {
            console.error('Bad canvas bounding box!', boundingBox);
            return false;
        }

        if (isNaN(parseInt(zoomPan.x)) || isNaN(parseInt(zoomPan.y))) {
            console.error('Bad transform state!', zoomPan);
            return false;
        }

        return true;
    }

    function isPath(path) {
        return Array.isArray(path) && path.every(p => isCoord(p));
    }

    function isCoord(v) {
        return isNum(v.x) && isNum(v.y);

    }

    function isNum(num) {
        return typeof num == 'number' && !isNaN(num);
    }

    function outOfBounds(point, box) {
        if (point.x <= box.x ||
            point.x >= box.x + box.width ||
            point.y <= box.y ||
            point.y >= box.y + box.height) {
            return true;
        } else {
            return false;
        }
    }

    return {
        isCoord,
        isNum,
        isPath,
        checkConvertionState,
        outOfBounds,
    }
}();

let MathUtil = function () {
    function add(v1, v2) {
        if (!ValUtil.isCoord(v1)) { console.error("Bad vector", v1); return { x: 0, y: 0 }; }
        if (!ValUtil.isCoord(v2)) { console.error("Bad vector", v2); return { x: 0, y: 0 }; }
        return {
            x: v1.x + v2.x,
            y: v1.y + v2.y
        }
    }

    function subtract(v1, v2) {
        if (!ValUtil.isCoord(v1)) { console.error("Bad vector", v1); return { x: 0, y: 0 }; }
        if (!ValUtil.isCoord(v2)) { console.error("Bad vector", v2); return { x: 0, y: 0 }; }
        return {
            x: v1.x - v2.x,
            y: v1.y - v2.y
        }
    }

    function scale(v, num) {
        if (!ValUtil.isCoord(v)) { console.error("Bad vector", v); return { x: 0, y: 0 }; }
        if (!ValUtil.isNum(num)) { console.error("Bad scalar", num); return { x: 0, y: 0 }; }
        return {
            x: v.x * num,
            y: v.y * num
        };
    }

    function length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    return {
        add,
        subtract,
        scale,
        length,
    }
}();


let PathUtil = function () {
    function translate(path, v) {
        if (!ValUtil.isPath(path)) { console.error("Bad path", path); return path; }
        if (!ValUtil.isCoord(v)) { console.error("Bad vector", v); return path; }
        return path.map(p => {
            return {
                x: p.x + v.x,
                y: p.y + v.y
            };
        })
    }

    function getBoundingBox(paths) {
        if (!Array.isArray(paths)) {
            console.error("Bad path set", paths);
            return null
        }
        if (ValUtil.isPath(paths)) {
            paths = [paths];
        }
        paths = paths.filter(path => {
            if (ValUtil.isPath(path)) return true;
            else { console.error("Bad Path", path); return false; }
        })
        if (paths.length == 0) { console.error("No valid paths input"); return null };

        let xs = paths.map(path => path.map(point => point.x)).flat();
        let ys = paths.map(path => path.map(point => point.y)).flat();
        let x = Math.min(...xs);
        let y = Math.min(...ys);
        let width = Math.max(1, (Math.max(...xs) - x));
        let height = Math.max(1, (Math.max(...ys) - y));

        return { x, y, height, width };
    }

    return {
        translate,
        getBoundingBox,
    }
}();

let DataUtil = function () {
    function numToColor(num) {
        return "#" + Math.round(num).toString(16).padStart(6, "0");
    }

    function rgbToHex(r, g, b) {
        return "#" +
            r.toString(16).padStart(2, "0") +
            g.toString(16).padStart(2, "0") +
            b.toString(16).padStart(2, "0");
    }

    function imageDataToHex(imgData) {
        return "#" +
            imgData.data[0].toString(16).padStart(2, "0") +
            imgData.data[1].toString(16).padStart(2, "0") +
            imgData.data[2].toString(16).padStart(2, "0");
    }

    function getBoundingBox(objs) {
        // if it's not an array assume it's a single instance and carry forward.
        if (!Array.isArray(objs)) {
            objs = [objs];
        }

        let boundingBoxes;
        if (objs.every(o => o instanceof Data.Stroke)) {
            boundingBoxes = objs.map(stroke => {
                let bb = PathUtil.getBoundingBox(stroke.path);

                bb.x -= stroke.size / 2
                bb.y -= stroke.size / 2
                bb.height += stroke.size
                bb.width += stroke.size

                return bb;
            });
        } else if (objs.every(o => o instanceof Data.Element)) {
            boundingBoxes = objs.map(elem => {
                let bb = getBoundingBox(elem.strokes);
                bb.x += elem.x
                bb.y += elem.y
                return bb;
            });
        } else {
            console.error("Invalid array. Not a set of Elements or Strokes", objs);
            return null;
        }

        if (boundingBoxes.length == 0) {
            console.error("No valid elements to bound. ", objs);
            return null;
        }

        let x = Math.min(...boundingBoxes.map(b => b.x));
        let y = Math.min(...boundingBoxes.map(b => b.y));
        let xMax = Math.max(...boundingBoxes.map(b => b.x + b.width));
        let yMax = Math.max(...boundingBoxes.map(b => b.y + b.height));

        return { x, y, width: xMax - x, height: yMax - y, }
    }

    return {
        numToColor,
        rgbToHex,
        imageDataToHex,
        getBoundingBox,
    }
}();

let IdUtil = function () {
    let idCounter = 0;
    function getUniqueId(classFunction) {
        return classFunction.name + "_" + Date.now() + "_" + idCounter++;
    }

    function isType(id, classFunction) {
        if (typeof id != "string") {
            console.error("invalid id", id);
            return false;
        }
        return id.split("_")[0] == classFunction.name;
    }

    return {
        getUniqueId,
        isType,
    }
}();
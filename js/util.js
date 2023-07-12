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

    return {
        isCoord,
        isNum,
        isPath,
        checkConvertionState,
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

    return {
        add,
        subtract,
        scale,
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
            return { x: 0, y: 0, height: 1, width: 1 }
        }
        if (ValUtil.isPath(paths)) {
            paths = [paths];
        }
        paths = paths.filter(path => {
            if (ValUtil.isPath(path)) return true;
            else { console.error("Bad Path", path); return false; }
        })
        if (paths.lengh == 0) { console.error("No valid paths input"); return { x: 0, y: 0, height: 1, width: 1 } };

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
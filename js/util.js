let ValidationUtil = function () {
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

    function isCoord(v) {
        return isNum(v.x) && isNum(v.y);

    }

    function isNum(num) {
        return typeof num == 'number' && !isNaN(num);
    }

    return {
        isCoord,
        isNum,
        checkConvertionState,
    }
}();

let MathUtil = function () {
    function add(v1, v2) {
        if (!ValidationUtil.isCoord(v1)) { console.error("Bad vector", v1); return { x: 0, y: 0 }; }
        if (!ValidationUtil.isCoord(v2)) { console.error("Bad vector", v2); return { x: 0, y: 0 }; }
        return {
            x: v1.x + v2.x,
            y: v1.y + v2.y
        }
    }

    function subtract(v1, v2) {
        if (!ValidationUtil.isCoord(v1)) { console.error("Bad vector", v1); return { x: 0, y: 0 }; }
        if (!ValidationUtil.isCoord(v2)) { console.error("Bad vector", v2); return { x: 0, y: 0 }; }
        return {
            x: v1.x - v2.x,
            y: v1.y - v2.y
        }
    }

    function scale(v, num) {
        if (!ValidationUtil.isCoord(v)) { console.error("Bad vector", v); return { x: 0, y: 0 }; }
        if (!ValidationUtil.isNum(num)) { console.error("Bad scalar", num); return { x: 0, y: 0 }; }
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
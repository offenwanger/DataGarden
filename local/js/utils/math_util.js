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

    function average(vs) {
        let total = vs.reduce((prev, cur) => add(prev, cur));
        return scale(total, 1 / vs.length);
    }

    function length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    // function angle(v1, v2) {
    //     return Math.atan2(v2.y - v1.y, v2.x - v1.x);
    // }

    function normalize(v) {
        let len = length(v);
        return { x: v.x / len, y: v.y / len }
    }

    return {
        add,
        subtract,
        scale,
        average,
        length,
        normalize,
    }
}();
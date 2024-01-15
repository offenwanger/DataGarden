import { DataUtil } from "./data_util.js";
import { ValUtil } from "./value_util.js";

export let VectorUtil = function () {
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

    function dist(v1, v2) {
        return length(subtract(v1, v2));
    }

    // function angle(v1, v2) {
    //     return Math.atan2(v2.y - v1.y, v2.x - v1.x);
    // }

    function normalize(v) {
        let len = length(v);
        return { x: v.x / len, y: v.y / len }
    }

    function equal(a, b) {
        if (!a || !DataUtil.isNumeric(a.x) || !DataUtil.isNumeric(a.y) || !b || !DataUtil.isNumeric(b.x) || !DataUtil.isNumeric(b.y)) {
            console.error("Invalid vectors for pointsEqual: ", a, b);
            return false;
        }

        return a.x == b.x && a.y == b.y;
    }

    function toRotation(vector) {
        vector = VectorUtil.normalize(vector);
        return Math.atan2(vector.y, vector.x);
    }

    function rotateLeft(vector) {
        if (!vector || !DataUtil.isNumeric(vector.x) || !DataUtil.isNumeric(vector.y)) {
            console.error("Invalid vector!", v);
            return { x: 0, y: 0 };
        }

        return { x: -vector.y, y: vector.x };
    }

    function rotateRight(vector) {
        if (!vector || !DataUtil.isNumeric(vector.x) || !DataUtil.isNumeric(vector.y)) {
            console.error("Invalid vector!", v);
            return { x: 0, y: 0 };
        }

        return { x: vector.y, y: -vector.x };
    }

    function rotate(v, radians) {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
    }

    function rotateAroundPoint(v, p, angle) {
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let x = (cos * (v.x - p.x)) + (sin * (v.y - p.y)) + p.x;
        let y = (cos * (v.y - p.y)) - (sin * (v.x - p.x)) + p.y;
        return { x, y };
    }

    function projectToLine(p, p1, p2) {
        let p1p2 = { x: p2.x - p1.x, y: p2.y - p1.y };
        let p1p = { x: p.x - p1.x, y: p.y - p1.y }

        let t = (p1p2.x * p1p.x + p1p2.y * p1p.y) / (p1p2.x * p1p2.x + p1p2.y * p1p2.y);
        return { x: p1.x + p1p2.x * t, y: p1.y + p1p2.y * t, t }
    }

    return {
        add,
        subtract,
        scale,
        average,
        length,
        dist,
        normalize,
        equal,
        toRotation,
        rotateLeft,
        rotateRight,
        rotate,
        rotateAroundPoint,
        projectToLine,
    }
}();
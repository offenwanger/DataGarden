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
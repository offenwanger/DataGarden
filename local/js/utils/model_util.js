let ModelUtil = function () {
    function wrapStrokeInElement(stroke) {
        let boundingBox = DataUtil.getBoundingBox(stroke);
        stroke.path = PathUtil.translate(stroke.path, { x: -boundingBox.x, y: -boundingBox.y })

        let elem = new Data.Element();
        elem.x = boundingBox.x;
        elem.y = boundingBox.y;
        elem.strokes.push(stroke);
        return elem;
    }

    function getStupidSpine(element) {
        let points = element.strokes.map(s => s.path).flat();
        let yMax = points.reduce((prev, current) => (prev.y > current.y) ? prev : current);
        let yMix = points.reduce((prev, current) => (prev.y < current.y) ? prev : current);
        let xMax = points.reduce((prev, current) => (prev.x > current.x) ? prev : current);
        let xMin = points.reduce((prev, current) => (prev.x < current.x) ? prev : current);
        points = [yMax, yMix, xMax, xMin];
        let pairs = points.flatMap((v, i) => points.slice(i + 1).map(w => [v, w]));
        pairs.map(pair => MathUtil.length)
    }

    return {
        wrapStrokeInElement,
    }
}();
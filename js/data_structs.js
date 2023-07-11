let Data = function () {
    let idCounter = 0;
    function getUniqueId() {
        idCounter++
        return Date.now() + "_" + idCounter;
    }

    function Stroke(path, size, color) {
        this.id = getUniqueId();
        this.creationTime = Date.now();
        this.path = path.map(p => { return { x: p.x, y: p.y } });
        this.size = size;
        this.color = color;

        this.clone = function () {
            let clone = new Stroke(this.path, this.size, this.color);
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            return clone;
        };
    }

    function Element() {
        this.id = getUniqueId();
        this.creationTime = Date.now();
        this.strokes = [];

        this.clone = function () {
            let clone = new Element();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.strokes = this.strokes.map(s => s.clone());
            return clone;
        };
    }

    function DataModel() {
        this.elements = [];

        this.clone = function () {
            let clone = new DataModel();
            clone.elements = this.elements.map(e => e.clone());
            return clone;
        }

        this.getStrokes = function () {
            return this.elements.map(e => e.strokes).flat();
        }
    }

    return {
        Stroke,
        Element,
        DataModel,
    }
}();
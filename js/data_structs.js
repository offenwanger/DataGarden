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

    function Element(x, y, height, width) {
        this.id = getUniqueId();
        this.x = x;
        this.y = y;
        this.height = height;
        this.width = width;
        this.creationTime = Date.now();
        this.strokes = [];

        this.vemX = 10;
        this.vemY = 10;
        this.parent = null;

        this.clone = function () {
            let clone = new Element();
            clone.x = this.x;
            clone.y = this.y;
            clone.height = this.height;
            clone.width = this.width;
            clone.id = this.id;
            clone.vemX = this.vemX;
            clone.vemY = this.vemY;
            clone.parent = this.parent;
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

        this.getElements = function () {
            return this.elements;
        }
    }

    return {
        Stroke,
        Element,
        DataModel,
    }
}();
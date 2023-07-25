let Data = function () {
    function Stroke(path, size, color) {
        this.id = IdUtil.getUniqueId(Stroke);
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
        this.id = IdUtil.getUniqueId(Element);
        this.creationTime = Date.now();
        this.x = null;
        this.y = null;
        this.strokes = [];

        this.vemX = null;
        this.vemY = null;
        this.parentId = null;

        this.clone = function () {
            let clone = new Element();
            clone.x = this.x;
            clone.y = this.y;
            clone.id = this.id;
            clone.vemX = this.vemX;
            clone.vemY = this.vemY;
            clone.parentId = this.parentId;
            clone.creationTime = this.creationTime;
            clone.strokes = this.strokes.map(s => s.clone());
            return clone;
        };

        this.update = function (element) {
            this.x = element.x;
            this.y = element.y;
            this.id = element.id;
            this.vemX = element.vemX;
            this.vemY = element.vemY;
            this.parentId = element.parentId;
            this.creationTime = element.creationTime;
            this.strokes = element.strokes.map(s => s.clone());
        };
    }

    function Group() {
        this.id = IdUtil.getUniqueId(Group);
        this.creationTime = Date.now();
        this.elements = [];

        this.structX = null;
        this.structY = null;
        this.parentId = null;

        this.orientationBinding = null;
        this.formBinding = null;
        this.cardinatlityBinding = null;
        this.positionBinding = null;

        this.clone = function () {
            let clone = new Group();
            clone.id = this.id;
            clone.structX = this.structX;
            clone.structY = this.structY;
            clone.parentId = this.parentId;
            clone.orientationBinding = this.orientationBinding;
            clone.formBinding = this.formBinding;
            clone.cardinatlityBinding = this.cardinatlityBinding;
            clone.positionBinding = this.positionBinding;
            clone.creationTime = this.creationTime;
            clone.elements = this.elements.map(s => s.clone());
            return clone;
        };
    }

    function Dimention() {
        this.id = IdUtil.getUniqueId(Dimention);
        this.creationTime = Date.now();
        this.structX = null;
        this.structY = null;
    }

    function Binding() {
        this.id = IdUtil.getUniqueId(Binding);
        this.creationTime = Date.now();

        this.structX = null;
        this.structY = null;

        this.dimention = null;
    }

    return {
        Stroke,
        Element,
        Group,
        Binding,
        Dimention,
    }
}();
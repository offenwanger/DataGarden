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
    Stroke.fromObject = function (obj) {
        let storke = new Stroke(obj.path, obj.size, obj.color);
        storke.id = obj.id;
        storke.creationTime = obj.creationTime;
        return storke;
    }

    function Element() {
        this.id = IdUtil.getUniqueId(Element);
        this.creationTime = Date.now();
        this.strokes = [];
        this.spine = null;
        this.parentId = null;

        this.clone = function () {
            let clone = new Element();
            clone.id = this.id;
            clone.parentId = this.parentId;
            clone.creationTime = this.creationTime;
            clone.strokes = this.strokes.map(s => s.clone());
            clone.spine = this.spine ? this.spine.map(p => { return { x: p.x, y: p.y } }) : null;
            return clone;
        };

        this.update = function (element) {
            this.id = element.id;
            this.parentId = element.parentId;
            this.creationTime = element.creationTime;
            this.strokes = element.strokes.map(s => s.clone());
            this.spine = element.spine.map(p => { return { x: p.x, y: p.y } });
        };
    }
    Element.fromObject = function (obj) {
        let element = new Element();
        element.id = obj.id;
        element.parentId = obj.parentId;
        element.creationTime = obj.creationTime;
        element.strokes = obj.strokes.map(s => Stroke.fromObject(s));
        element.spine = obj.spine ? obj.spine.map(p => { return { x: p.x, y: p.y } }) : null;
        return element;
    }

    function Dimention() {
        this.id = IdUtil.getUniqueId(Dimention);
        this.creationTime = Date.now();
        this.name = "Dimention";
        this.type = DimentionType.DISCRETE;
        this.channel = ChannelType.FORM;
        this.tier = 0;
        // discrete dimentions
        this.levels = [];
        // continuous dimentions
        this.domain = [0, 1]

        this.clone = function () {
            let clone = new Dimention();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.name = this.name;
            clone.type = this.type;
            clone.channel = this.channel;
            clone.tier = this.tier;
            clone.levels = this.levels.map(l => l.clone());
            clone.domain = [...this.domain];
            return clone;
        };

        this.update = function (dimention) {
            this.id = dimention.id;
            this.creationTime = dimention.creationTime;
            this.name = dimention.name;
            this.type = dimention.type;
            this.channel = dimention.channel;
            this.tier = dimention.tier;
            this.levels = dimention.levels.map(l => l.clone());
            this.domain = [...dimention.domain];
        };
    }
    Dimention.fromObject = function (obj) {
        let dimention = new Dimention();
        dimention.id = obj.id;
        dimention.creationTime = obj.creationTime;
        dimention.name = obj.name;
        dimention.type = obj.type;
        dimention.channel = obj.channel;
        dimention.tier = obj.tier;
        dimention.levels = obj.levels ? obj.levels.map(l => Level.fromObject(l)) : [];
        dimention.domain = obj.domain ? [...obj.domain] : [0, 1];
        return dimention;
    }


    function Level() {
        this.id = IdUtil.getUniqueId(Level);
        this.creationTime = Date.now();
        this.name = "Level";
        this.elementIds = [];

        this.clone = function () {
            let clone = new Level();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.name = this.name;
            clone.elementIds = [...this.elementIds];
            return clone;
        };

        this.update = function (level) {
            this.id = level.id;
            this.creationTime = level.creationTime;
            this.name = level.name;
            this.elementIds = [...level.elementIds];
        };
    }
    Level.fromObject = function (obj) {
        let level = new Level();
        level.id = obj.id;
        level.creationTime = obj.creationTime;
        level.name = obj.name;
        level.elementIds = [...obj.elementIds];
        return level;
    }

    return {
        Stroke,
        Element,
        Dimention,
        Level,
    }
}();
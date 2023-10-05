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

    function Group() {
        this.id = IdUtil.getUniqueId(Group);
        this.creationTime = Date.now();
        this.elements = []
        this.mappings = [];

        this.clone = function () {
            let clone = new Group();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.elements = this.elements.map(s => s.clone());
            clone.mappings = this.mappings.map(c => c.clone());
            return clone;
        };

        this.update = function (group) {
            this.id = group.id;
            this.creationTime = group.creationTime;
            this.elements = group.elements.map(s => s.clone());
            this.mappings = group.mappings ? group.mappings.map(c => c.clone()) : [];
        };
    }
    Group.fromObject = function (obj) {
        let group = new Group();
        group.id = obj.id;
        group.creationTime = obj.creationTime;
        group.elements = obj.elements.map(e => Element.fromObject(e));
        group.mappings = obj.mappings ? obj.mappings.map(c => Mapping.fromObject(c)) : [];
        return group;
    }

    function Mapping() {
        this.id = IdUtil.getUniqueId(Mapping);
        this.creationTime = Date.now();
        this.channelType = null;
        this.dimention = null;

        // The following ordered lists must align between channel and dimetion. 
        // continuous channel mapping, array of ranges [min, max]
        this.ranges = [];
        // discrete channel mapping, array of arrays of element ids
        this.groups = [];

        // continuous dimention mapping, array of domains [min, max]
        this.domains = [];
        // discreate dimention mapping, array of level ids
        this.levels = [];

        this.clone = function () {
            let clone = new Mapping();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.channelType = this.channelType;
            clone.dimention = this.dimention;
            clone.ranges = this.ranges.map(r => [...r]);
            clone.groups = this.groups.map(g => [...g]);
            clone.domains = this.domains.map(g => [...g]);
            clone.levels = [...this.levels];
            return clone;
        };

        this.update = function (mapping) {
            this.id = mapping.id;
            this.creationTime = mapping.creationTime;
            this.channelType = mapping.channelType;
            this.dimention = mapping.dimention;
            this.ranges = mapping.ranges.map(r => [...r]);
            this.groups = mapping.groups.map(g => [...g]);
            this.domains = mapping.domains.map(g => [...g]);
            this.levels = [...mapping.levels];
        };
    }
    Mapping.fromObject = function (obj) {
        let mapping = new Mapping();
        mapping.id = obj.id;
        mapping.creationTime = obj.creationTime;
        mapping.channelType = obj.channelType;
        mapping.dimention = obj.dimention;
        mapping.ranges = obj.ranges ? obj.ranges.map(r => [...r]) : [];
        mapping.groups = obj.groups ? obj.groups.map(g => [...g]) : [];
        mapping.domains = obj.domains ? obj.domains.map(g => [...g]) : [];
        mapping.levels = obj.levels ? [...obj.levels] : [];
        return mapping;
    }

    function Dimention() {
        this.id = IdUtil.getUniqueId(Dimention);
        this.creationTime = Date.now();
        this.continuous = false;
        // discrete dimentions
        this.levels = [];
        // continuous dimentions
        this.domain = [0, 1]

        this.clone = function () {
            let clone = new Dimention();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.continuous = this.continuous;
            clone.levels = this.levels.map(l => l.clone());
            clone.domain = [...this.domain]
            return clone;
        };

        this.update = function (dimention) {
            this.id = dimention.id;
            this.creationTime = dimention.creationTime;
            this.continuous = dimention.continuous;
            this.levels = dimention.levels.map(l => l.clone());
            this.domain = [...dimention.domain]
        };
    }
    Dimention.fromObject = function (obj) {
        let dimention = new Dimention();
        dimention.id = obj.id;
        dimention.creationTime = obj.creationTime ? obj.creationTime : [];
        dimention.continuous = obj.continuous;
        dimention.levels = obj.levels ? obj.levels.map(l => Level.fromObject(l)) : [];
        dimention.domain = obj.domain ? [...obj.domain] : [0, 1];
        return dimention;
    }


    function Level() {
        this.id = IdUtil.getUniqueId(Level);
        this.creationTime = Date.now();
        this.name;

        this.clone = function () {
            let clone = new Level();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.name = this.name;
            return clone;
        };

        this.update = function (level) {
            this.id = level.id;
            this.creationTime = level.creationTime;
            this.name = level.name;
        };
    }
    Level.fromObject = function (obj) {
        let level = new Level();
        level.id = obj.id;
        level.creationTime = obj.creationTime;
        level.name = obj.name;
        return level;
    }

    return {
        Stroke,
        Element,
        Group,
        Dimention,
        Level,
        Mapping,
    }
}();
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
        this.spine = null;

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
            clone.spine = this.spine.map(p => { return { x: p.x, y: p.y } });
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
            this.spine = element.spine.map(p => { return { x: p.x, y: p.y } });
        };
    }

    function Group() {
        this.id = IdUtil.getUniqueId(Group);
        this.creationTime = Date.now();
        this.elements = []
        this.forms = [];

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

        this.update = function (dimention) {
            this.id = dimention.id;
            this.structX = dimention.structX;
            this.structY = dimention.structY;
            this.parentId = dimention.parentId;
            this.orientationBinding = dimention.orientationBinding;
            this.formBinding = dimention.formBinding;
            this.cardinatlityBinding = dimention.cardinatlityBinding;
            this.positionBinding = dimention.positionBinding;
            this.creationTime = dimention.creationTime;
            this.elements = dimention.elements.map(s => s.clone());
        };
    }

    function Form() {
        this.id = IdUtil.getUniqueId(Group);
        this.creationTime = Date.now();
        this.elementIds = []

        this.clone = function () {
            let clone = new Form();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.elementIds = [...this.elementIds];
            return clone;
        };

        this.update = function (form) {
            this.id = form.id;
            this.creationTime = form.creationTime;
            this.elementIds = [...form.elementIds];
        };
    }

    function Dimention() {
        this.id = IdUtil.getUniqueId(Dimention);
        this.creationTime = Date.now();
        this.name = "Dimention";
        this.type = DimentionTypes.CATEGORICAL;
        this.range = [0, 1];
        this.levels = [];
        this.structX = null;
        this.structY = null;

        this.clone = function () {
            let clone = new Dimention();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.name = this.name;
            clone.type = this.type;
            clone.structX = this.structX;
            clone.structY = this.structY;
            clone.range = [...this.range];
            clone.levels = this.levels.map(c => c.clone())
            return clone;
        };

        this.update = function (dimention) {
            this.id = dimention.id;
            this.creationTime = dimention.creationTime;
            this.name = dimention.name;
            this.type = dimention.type;
            this.structX = dimention.structX;
            this.structY = dimention.structY;
            this.range = [...dimention.range];
            this.levels = dimention.levels.map(c => c.clone())
        };
    }

    /**  A catigorical or ordinal level.  */
    function Level() {
        this.id = IdUtil.getUniqueId(Level);
        this.creationTime = Date.now();
        this.name = "Category";

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

    function Mapping() {
        this.id = IdUtil.getUniqueId(Mapping);
        this.creationTime = Date.now();
        this.groupId = null;
        this.channel = null;
        this.dimentionId = null;

        this.links = [];

        this.clone = function () {
            let clone = new Mapping();
            clone.id = this.id;
            clone.creationTime = this.creationTime;
            clone.groupId = this.groupId;
            clone.channel = this.channel;
            clone.dimentionId = this.dimentionId;
            clone.links = this.links.map(l => l.clone())
            return clone;
        };

        this.update = function (mapping) {
            this.id = mapping.id;
            this.creationTime = mapping.creationTime;
            this.groupId = mapping.groupId;
            this.channel = mapping.channel;
            this.dimentionId = mapping.dimentionId;
            this.links = mapping.links.map(l => l.clone())
        };

    }

    function Link() {
        this.id = IdUtil.getUniqueId(Link);
        this.creationTime = Date.now();
        this.formId = null; // linking channel[form]
        this.elementId = null; // linking channel[number]
        this.rangeMin = null; // linking channel[form/number] to dimention[cont]
        this.rangeMax = null; // linking channel[form/number] to dimention[cont]

        this.levelId = null; // linking dimention[cat/ord]
        this.channelMin = null; // linking channel[orientation/position] to dimention[cat/ord]
        this.channelMax = null; // linking channel[orientation/position] to dimention[cat/ord]

        this.clone = function () {
            let clone = new Link();
            clone.id = this.id
            clone.creationTime = this.creationTime
            clone.formId = this.formId
            clone.elementId = this.elementId
            clone.rangeMin = this.rangeMin
            clone.rangeMax = this.rangeMax
            clone.levelId = this.levelId
            clone.channelMin = this.channelMin
            clone.channelMax = this.channelMax
            return clone;
        };

        this.update = function (link) {
            this.id = link.id
            this.creationTime = link.creationTime
            this.formId = link.formId
            this.elementId = link.elementId
            this.rangeMin = link.rangeMin
            this.rangeMax = link.rangeMax
            this.levelId = link.levelId
            this.channelMin = link.channelMin
            this.channelMax = link.channelMax
        };
    }


    return {
        Stroke,
        Element,
        Group,
        Form,
        Dimention,
        Level,
        Mapping,
        Link,
    }
}();
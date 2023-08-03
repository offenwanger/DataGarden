function DataModel() {
    let mGroups = [];
    let mDimentions = [];
    let mMappings = [];

    function clone() {
        let clone = new DataModel();
        clone.setGroups(getGroups().map(e => e.clone()));
        clone.setDimentions(getDimentions().map(e => e.clone()));
        clone.setMappings(getMappings().map(e => e.clone()));
        return clone;
    }

    function getStroke(strokeId) {
        return getStrokes.find(s => s.id == strokeId);
    }

    function getStrokes() {
        getElements().map(e => e.strokes).flat()
    }

    function getStrokesInLocalCoords(ids) {
        if (typeof ids == 'string') {
            ids = [ids];
        }
        let returnable = [];
        let strokeIds = ids.filter(id => IdUtil.isType(id, Data.Stroke));
        strokeIds.forEach(strokeId => {
            let element = getElementForStroke(strokeId);
            // TODO: check if stroke exists
            let stroke = element.strokes.find(s => s.id == strokeId).clone();
            stroke.path = PathUtil.translate(stroke.path, element);
            returnable.push(stroke);
        });

        let elementIds = ids.filter(id => IdUtil.isType(id, Data.Element));
        let groupIds = ids.filter(id => IdUtil.isType(id, Data.Group));
        groupIds.forEach(groupId => {
            // TODO: Check if group exists
            elementIds.push(...getGroup(groupId).elements.map(e => e.id));
        })
        elementIds = elementIds.filter((id, index, array) => array.indexOf(id) === index);

        elementIds.forEach(elementId => {
            let element = getElement(elementId);
            element.strokes.forEach(stroke => {
                stroke = stroke.clone();
                stroke.path = PathUtil.translate(stroke.path, element);
                returnable.push(stroke);
            });
        });

        return returnable;
    }

    function getElement(elementId) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Not an element id! " + elementId); return null; };
        return getElements().find(e => e.id == elementId);
    }

    function getElementForStroke(strokeId) {
        if (!IdUtil.isType(strokeId, Data.Stroke)) { console.error("Not an stroke id! " + strokeId); return null; };
        return getElements().find(e => e.strokes.some(s => s.id == strokeId))
    }

    function getElements() {
        return getGroups().map(g => g.elements).flat();
    }

    function getElementChildren(elementId) {
        return getElements().filter(e => e.parentId == elementId);
    }

    function getElementDecendants(elementId) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Not an element id! " + elementId); return null; };
        let elements = [];
        let elementQueue = [this.getElement(elementId)];
        let allElements = this.getElements();
        while (elementQueue.length > 0) {
            let elem = elementQueue.shift();
            elements.push(elem);
            elementQueue.push(...allElements.filter(e => e.parentId == elem.id));
        }
        return elements;
    }

    function getGroup(groupId) {
        if (!IdUtil.isType(groupId, Data.Group)) { console.error("Not an group id! " + groupId); return null; };
        return getGroups().find(g => g.id == groupId)
    }

    function getGroupForElement(elementId) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Not an element id! " + elementId); return null; };
        return getGroups().find(g => g.elements.some(e => e.id == elementId));
    }

    function getGroups() {
        return mGroups;
    }

    function setGroups(groups) {
        mGroups = groups;
    }

    function getDimention(dimentionId) {
        if (!IdUtil.isType(dimentionId, Data.Dimention)) { console.error("Not an dimention id! " + dimentionId); return null; };
        return getDimentions().find(d => d.id == dimentionId)
    }

    function getDimentions() {
        return mDimentions;
    }

    function setDimentions(dimentions) {
        mDimentions = dimentions;
    }

    function getMapping(mappingId) {
        if (!IdUtil.isType(mappingId, Data.Mapping)) { console.error("Not an mapping id! " + mappingId); return null; };
        return getMappings().find(d => d.id == mappingId)
    }

    function getMappings() {
        return mMappings;
    }

    function setMappings(mappings) {
        mMappings = mappings;
    }

    this.clone = clone;
    this.getStroke = getStroke;
    this.getStrokes = getStrokes;
    this.getStrokesInLocalCoords = getStrokesInLocalCoords;
    this.getElement = getElement;
    this.getElementForStroke = getElementForStroke;
    this.getElements = getElements;
    this.getElementDecendants = getElementDecendants;
    this.getElementChildren = getElementChildren;
    this.getGroup = getGroup;
    this.getGroupForElement = getGroupForElement;
    this.getGroups = getGroups;
    this.setGroups = setGroups;
    this.getDimention = getDimention;
    this.getDimentions = getDimentions;
    this.setDimentions = setDimentions;
    this.getMapping = getMapping;
    this.getMappings = getMappings;
    this.setMappings = setMappings;
}
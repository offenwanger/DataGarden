function DataModel() {
    let groups = [];

    function clone() {
        let clone = new DataModel();
        clone.setGroups(getGroups().map(e => e.clone()));
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
        return getElements().find(e => e.id == elementId);
    }

    function getElementForStroke(strokeId) {
        return getElements().find(e => e.strokes.some(s => s.id == strokeId))
    }

    function getElements() {
        return getGroups().map(g => g.elements).flat();
    }

    function getElementDecendants(elementId) {
        let elements = [];
        let elementQueue = [getElement(elementId)];
        let allElements = getElements();
        while (elementQueue.length > 0) {
            let elem = elementQueue.shift();
            elements.push(elem);
            elementQueue.push(...allElements.filter(e => e.parent == elem.id));
        }
        return elements;
    }

    function getGroup(groupId) {
        return getGroups().find(g => g.id == groupId)
    }

    function getGroupForElement(elementId) {
        return getGroups().find(g => g.elements.some(e => e.id == elementId));
    }

    function getGroups() {
        return groups;
    }

    this.clone = clone;
    this.getStroke = getStroke;
    this.getStrokes = getStrokes;
    this.getStrokesInLocalCoords = getStrokesInLocalCoords;
    this.getElement = getElement;
    this.getElementForStroke = getElementForStroke;
    this.getElements = getElements;
    this.getElementDecendants = getElementDecendants;
    this.getGroup = getGroup;
    this.getGroupForElement = getGroupForElement;
    this.getGroups = getGroups;
    this.setGroups = (g) => groups = g;
}
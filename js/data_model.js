function DataModel() {
    let groups = [];

    function clone() {
        let clone = new DataModel();
        clone.setGroups(getGroups().map(e => e.clone()));
        return clone;
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
    this.getElement = getElement;
    this.getElementForStroke = getElementForStroke;
    this.getElements = getElements;
    this.getElementDecendants = getElementDecendants;
    this.getGroup = getGroup;
    this.getGroupForElement = getGroupForElement;
    this.getGroups = getGroups;
    this.setGroups = (g) => groups = g;
}
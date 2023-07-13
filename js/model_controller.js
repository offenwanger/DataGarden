
function ModelController() {
    let mDataModel = new DataModel();

    function addGroup(group) {
        mDataModel.getGroups().push(group);
    }

    function addElement(groupId, elem) {
        let group = mDataModel.getGroup(groupId);
        if (!group) { console.error("Group not found for id: ", groupId); return; };
        group.elements.push(elem);
    }

    function removeElement(elementId) {
        let group = mDataModel.getGroupForElement(elementId);
        if (!group) { console.error("Group not found for element: ", elementId); return; };
        group.push(elem);
    }

    function addStroke(elementId, stroke) {
        let elem = mDataModel.getElement(elementId);
        if (!elem) { console.error("Element not found for id: ", elementId); return; };
        elem.strokes.push(stroke);
    }

    function removeStorke(strokeId) {
        let elem = mDataModel.getElementForStroke(strokeId);
        if (!elem) { console.error("Element not found for stroke: ", strokeId); return; };
        elem.strokes = elem.strokes.filter(s => s.id != strokeId);
    }

    function getModel() {
        return mDataModel.clone();
    }

    return {
        addGroup,
        addElement,
        removeElement,
        addStroke,
        removeStorke,
        getModel,
    }
}
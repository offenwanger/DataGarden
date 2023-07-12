
function ModelController() {
    let mDataModel = new Data.DataModel();

    function addGroup(group) {
        mDataModel.groups.push(group);
    }

    function addElement(groupId, elem) {
        let group = mDataModel.groups.find(g => g.id == groupId)
        if (!group) { console.error("Group not found for id: ", groupId); return; };
        group.elements.push(elem);
    }

    function removeElement(elementId) {
        let group = mDataModel.getGroups().find(g => g.elements.some(e => e.id == elementId));
        if (!group) { console.error("Group not found for element: ", elementId); return; };
        group.push(elem);

    }

    function addStroke(elementId, stroke) {
        let elem = mDataModel.getElements().find(e => e.id == elementId);
        if (!elem) { console.error("Element not found for id: ", elementId); return; };
        elem.strokes.push(stroke);
    }

    function removeStorke(strokeId) {
        let elem = mDataModel.getElements().find(e => e.strokes.some(s => s.id == strokeId));
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
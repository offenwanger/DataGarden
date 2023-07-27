
function ModelController() {
    let mDataModel = new DataModel();

    function addGroup(group) {
        if (!ValUtil.isType(group, Data.Group)) { console.error("Invalid group", group); return; }
        mDataModel.getGroups().push(group);
    }

    function removeGroup(groupId) {
        if (!IdUtil.isType(groupId, Data.Group)) { console.error("Invalid group id", groupId); return; }
        mDataModel.setGroups(mDataModel.getGroups().filter(g => g.id != groupId));
    }

    function addDimention(dimention) {
        if (!ValUtil.isType(dimention, Data.Dimention)) { console.error("Invalid dimention", dimention); return; }
        mDataModel.getDimentions().push(dimention);
    }

    function removeDimention(dimentionId) {
        if (!IdUtil.isType(dimentionId, Data.Dimention)) { console.error("Invalid dimention id", dimentionId); return; }
        mDataModel.setDimentions(mDataModel.getDimentions().filter(d => d.id != dimentionId));
    }

    function updateGroup(group) {
        if (!ValUtil.isType(group, Data.Group)) { console.error("Invalid group", group); return; }
        let currGroup = mDataModel.getElement(group.id);
        if (!currGroup) { console.error("Group not found for id", group.id); return; }
        currGroup.set(group);
    }

    function addElement(groupId, elem) {
        if (!ValUtil.isType(elem, Data.Element)) { console.error("Invalid element", element); return; }
        if (!IdUtil.isType(groupId, Data.Group)) { console.error("Invalid group id", groupId); return; }
        let group = mDataModel.getGroup(groupId);
        if (!group) { console.error("Group not found for id: ", groupId); return; };
        group.elements.push(elem);
    }

    function removeElement(elementId) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Invalid group id", groupId); return; }
        let group = mDataModel.getGroupForElement(elementId);
        if (!group) { console.error("Group not found for element: ", elementId); return; };
        group.elements = group.elements.filter(e => e.id != elementId);
    }

    function updateElement(element) {
        if (!ValUtil.isType(element, Data.Element)) { console.error("Invalid element", element); return; }
        let currElement = mDataModel.getElement(element.id);
        if (!currElement) { console.error("Element not found for id", element.id); return; }
        currElement.update(element);
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
        removeGroup,
        updateGroup,
        addDimention,
        removeDimention,
        addElement,
        removeElement,
        updateElement,
        addStroke,
        removeStorke,
        getModel,
    }
}
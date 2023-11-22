
function ModelController() {
    let mDataModel = new DataModel();

    function addDimention(dimention) {
        if (!ValUtil.isType(dimention, Data.Dimention)) { console.error("Invalid dimention", dimention); return; }
        mDataModel.getDimentions().push(dimention);
    }

    function removeDimention(dimentionId) {
        if (!IdUtil.isType(dimentionId, Data.Dimention)) { console.error("Invalid dimention id", dimentionId); return; }
        mDataModel.setDimentions(mDataModel.getDimentions().filter(d => d.id != dimentionId));
    }

    function updateDimention(dimention) {
        if (!ValUtil.isType(dimention, Data.Dimention)) { console.error("Invalid dimention", dimention); return; }
        let currDimention = mDataModel.getDimention(dimention.id);
        if (!currDimention) { console.error("Dimention not found for id", dimention.id); return; }
        currDimention.update(dimention);
    }

    function addElement(element) {
        if (!ValUtil.isType(element, Data.Element)) { console.error("Invalid element", element); return; }
        mDataModel.getElements().push(element);
    }

    function removeElement(elementId) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Invalid element id", elementId); return; }
        mDataModel.setElements(mDataModel.getElements().filter(g => g.id != elementId));
    }

    function updateElement(element) {
        if (!ValUtil.isType(element, Data.Element)) { console.error("Invalid element", element); return; }
        let currElement = mDataModel.getElement(element.id);
        if (!currElement) { console.error("Element not found for id", element.id); return; }
        currElement.update(element);
    }

    function addLevel(dimentionId, level) {
        if (!ValUtil.isType(level, Data.Level)) { console.error("Invalid level", level); return; }
        if (!IdUtil.isType(dimentionId, Data.Dimention)) { console.error("Invalid dimention id", dimentionId); return; }
        let dimention = mDataModel.getDimention(dimentionId);
        if (!dimention) { console.error("Dimention not found for id: ", dimentionId); return; };
        dimention.levels.push(level);
    }

    function removeLevel(levelId) {
        if (!IdUtil.isType(levelId, Data.Level)) { console.error("Invalid dimention id", dimentionId); return; }
        let dimention = mDataModel.getDimentionForLevel(levelId);
        if (!dimention) { console.error("Dimention not found for level: ", levelId); return; };
        dimention.levels = dimention.levels.filter(e => e.id != levelId);
    }

    function updateLevel(level) {
        if (!ValUtil.isType(level, Data.Level)) { console.error("Invalid level", level); return; }
        let currLevel = mDataModel.getLevel(level.id);
        if (!currLevel) { console.error("Level not found for id", level.id); return; }
        currLevel.update(level);
    }

    function addStroke(elementId, stroke) {
        let elem = mDataModel.getElement(elementId);
        if (!elem) { console.error("Element not found for id: ", elementId); return; };
        elem.strokes.push(stroke);
    }

    function removeStroke(strokeId) {
        let elem = mDataModel.getElementForStroke(strokeId);
        if (!elem) { console.error("Element not found for stroke: ", strokeId); return; };
        elem.strokes = elem.strokes.filter(s => s.id != strokeId);
    }

    function getModel() {
        return mDataModel.clone();
    }

    function setModel(model) {
        mDataModel = model.clone();
    }

    return {
        addDimention,
        removeDimention,
        updateDimention,
        addElement,
        removeElement,
        updateElement,
        addLevel,
        removeLevel,
        updateLevel,
        addStroke,
        removeStroke,
        getModel,
        setModel,
    }
}
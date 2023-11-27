
function ModelController() {
    let mDataModel = new DataModel();

    function addDimension(dimension) {
        if (!ValUtil.isType(dimension, Data.Dimension)) { console.error("Invalid dimension", dimension); return; }
        mDataModel.getDimensions().push(dimension);
    }

    function removeDimension(dimensionId) {
        if (!IdUtil.isType(dimensionId, Data.Dimension)) { console.error("Invalid dimension id", dimensionId); return; }
        mDataModel.setDimensions(mDataModel.getDimensions().filter(d => d.id != dimensionId));
    }

    function updateDimension(dimension) {
        if (!ValUtil.isType(dimension, Data.Dimension)) { console.error("Invalid dimension", dimension); return; }
        let currDimension = mDataModel.getDimension(dimension.id);
        if (!currDimension) { console.error("Dimension not found for id", dimension.id); return; }
        currDimension.update(dimension);
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

    function addLevel(dimensionId, level) {
        if (!ValUtil.isType(level, Data.Level)) { console.error("Invalid level", level); return; }
        if (!IdUtil.isType(dimensionId, Data.Dimension)) { console.error("Invalid dimension id", dimensionId); return; }
        let dimension = mDataModel.getDimension(dimensionId);
        if (!dimension) { console.error("Dimension not found for id: ", dimensionId); return; };
        dimension.levels.push(level);
    }

    function removeLevel(levelId) {
        if (!IdUtil.isType(levelId, Data.Level)) { console.error("Invalid dimension id", dimensionId); return; }
        let dimension = mDataModel.getDimensionForLevel(levelId);
        if (!dimension) { console.error("Dimension not found for level: ", levelId); return; };
        dimension.levels = dimension.levels.filter(e => e.id != levelId);
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
        addDimension,
        removeDimension,
        updateDimension,
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

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

    function updateStroke(stroke) {
        if (!ValUtil.isType(stroke, Data.Stroke)) { console.error("Invalid stroke", stroke); return; }
        let currStroke = mDataModel.getStroke(stroke.id);
        if (!currStroke) { console.error("Stroke not found for id", stroke.id); return; }
        currStroke.update(stroke);
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
        if (!IdUtil.isType(strokeId, Data.Stroke)) { console.error("Invalid Storke Id", strokeId); return; };
        let stroke = mDataModel.getStroke(strokeId);
        if (!stroke) { return; } // already not here.
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
        updateStroke,
        updateLevel,
        addStroke,
        removeStroke,
        getModel,
        setModel,
    }
}
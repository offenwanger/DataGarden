
function ModelController() {
    let mDataModel = new Data.DataModel();

    function newElement(strokes) {
        let elem = new Data.Element();
        if (Array.isArray(strokes)) {
            // TODO: Handle bad strokes.
            elem.strokes = strokes.map(s => s.clone()); d
        } else {
            // TODO: Handle null case.
            elem.strokes = [strokes];
        }
        mDataModel.elements.push(elem)
    }

    function addStroke(elementId, stroke) {
        let elem = mDataModel.elements.find(e => e.id == elementId);
        // TODO: Handle element not found
        elem.strokes.push(stroke);
    }

    function removeStorke(strokeId) {
        let elem = mDataModel.elements.find(e => e.strokes.some(s => s.id == strokeId));
        // TODO: Handle element not found
        elem.strokes = elem.strokes.filter(s => s.id != strokeId);
        if (elem.strokes.length == 0) {
            mDataModel.elements = mDataModel.elements.filter(e => e.id != elem.id);
        }
    }

    function getModel() {
        return mDataModel.clone();
    }

    return {
        addStroke,
        removeStorke,
        newElement,
        getModel
    }

}
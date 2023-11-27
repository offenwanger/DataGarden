function DataModel() {
    let mElements = [];
    let mDimensions = [];

    function clone() {
        let clone = new DataModel();
        clone.setElements(getElements().map(e => e.clone()));
        clone.setDimensions(getDimensions().map(e => e.clone()));
        return clone;
    }

    function toObject() {
        let model = this.clone();
        return {
            elements: model.getElements(),
            dimensions: model.getDimensions()
        }
    }

    function getStroke(strokeId) {
        return getStrokes().find(s => s.id == strokeId);
    }

    function getStrokes() {
        return getElements().map(e => e.strokes).flat();
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
        return mElements;
    }

    function setElements(elements) {
        mElements = elements;
    }

    function getElementChildren(elementId) {
        return getElements().filter(e => e.parentId == elementId);
    }

    // returns an array with the element and all it's decendants
    function getElementDecendants(elementId) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Not an element id! " + elementId); return null; };
        let elements = [];
        let elementQueue = [getElement(elementId)];
        let allElements = getElements();
        while (elementQueue.length > 0) {
            let elem = elementQueue.shift();
            elements.push(elem);
            elementQueue.push(...allElements.filter(e => e.parentId == elem.id));
        }
        return elements;
    }

    function getDimension(dimensionId) {
        if (!IdUtil.isType(dimensionId, Data.Dimension)) { console.error("Not an dimension id! " + dimensionId); return null; };
        return getDimensions().find(d => d.id == dimensionId)
    }

    function getDimensions() {
        return mDimensions;
    }

    function setDimensions(dimensions) {
        mDimensions = dimensions;
    }

    function getDimensionForLevel(levelId) {
        if (!IdUtil.isType(levelId, Data.Level)) { console.error("Not an level id! " + levelId); return null; };
        return getDimensions().find(d => d.levels.some(l => l.id == levelId));
    }

    function getLevel(levelId) {
        if (!IdUtil.isType(levelId, Data.Level)) { console.error("Not an level id! " + levelId); return null; };
        return getDimensions().map(d => d.levels).flat().find(l => l.id == levelId);
    }

    function getLevelForElement(dimensionId, elementId) {
        let dimension = getDimension(dimensionId);
        if (!dimension) return null;
        return dimension.levels.find(l => l.elementIds.includes(elementId));
    }

    function getTables() {
        if (mDimensions.length == 0) return [];
        let parents = DataUtil.unique(mElements.map(e => e.parentId).filter(p => p));
        let leafs = mElements.filter(e => !parents.includes(e.id));
        let rows = []
        leafs.forEach(leaf => {
            let row = {};
            let nextId = leaf.id;
            let level = DataUtil.getTreeLevel(this, leaf.id);
            while (nextId) {
                let element = getElement(nextId);
                mDimensions.filter(d => d.tier == level).forEach(dimension => {
                    let value = DataUtil.getMappedValue(this, dimension.id, nextId);
                    if (value) row[dimension.id] = { id: nextId, value };
                })

                level--;
                nextId = element.parentId;
            }
            rows.push(row);
        })

        let colsQueue = [mDimensions[0].id];
        let uncheckedCols = mDimensions.slice(1).map(d => d.id);
        let rowsQueue = [];
        let uncheckedRows = rows.map((r, i) => i);
        let tables = [];
        let curTable = { cols: [], rows: [] };
        while (uncheckedCols.length > 0 || colsQueue.length > 0) {
            while (colsQueue.length > 0) {
                let col = colsQueue.pop();
                curTable.cols.push(col);
                let colRows = uncheckedRows.filter((index) => rows[index][col]);
                rowsQueue.push(...colRows);
                uncheckedRows = uncheckedRows.filter((index) => !rows[index][col]);
            }

            while (rowsQueue.length > 0) {
                let row = rows[rowsQueue.pop()];
                curTable.rows.push(row);
                let rowCols = uncheckedCols.filter((col) => row[col]);
                colsQueue.push(...rowCols);
                uncheckedCols = uncheckedCols.filter((col) => !row[col]);
            }

            if (rowsQueue.length == 0 && colsQueue.length == 0 && uncheckedCols.length > 0) {
                if (curTable.rows.length > 0) {
                    tables.push(curTable);
                    curTable = { cols: [], rows: [] };
                }
                colsQueue.push(uncheckedCols.pop());
            }
        }

        if (curTable.rows.length > 0) tables.push(curTable)

        return tables;
    }

    return {
        clone,
        toObject,
        getStroke,
        getStrokes,
        getElement,
        getElementForStroke,
        getElements,
        setElements,
        getElementDecendants,
        getElementChildren,
        getDimension,
        getDimensions,
        setDimensions,
        getDimensionForLevel,
        getLevel,
        getLevelForElement,
        getTables,
    }
}

DataModel.fromObject = function (obj) {
    let model = new DataModel();
    if (!Array.isArray(obj.elements) || !Array.isArray(obj.dimensions)) {
        console.error("Invalid data model object", obj);
        return;
    }
    model.setElements(obj.elements.map(g => Data.Element.fromObject(g)));
    model.setDimensions(obj.dimensions.map(d => Data.Dimension.fromObject(d)));
    return model;
}
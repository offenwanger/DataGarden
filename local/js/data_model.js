import { DimensionType } from "./constants.js";
import { Data } from "./data_structs.js";
import { DataUtil } from "./utils/data_util.js";
import { IdUtil } from "./utils/id_util.js";

export function DataModel() {
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

    function getElementMappedValues(elementId) {
        let level = DataUtil.getLevelForElement(elementId, this)
        let result = [];
        getDimensions().filter(d => d.level == level && DataUtil.dimensionValid(d)).forEach(dimension => {
            let value = DataUtil.getMappedValue(this, dimension.id, elementId);
            if (typeof value == "number") { value = Math.round(value * 100) / 100 }
            if (value || value === 0) {
                result.push({ dimensionId: dimension.id, dimensionName: dimension.name, value: value });
            }
        })
        return result;
    }

    function getDimension(dimensionId) {
        if (!IdUtil.isType(dimensionId, Data.Dimension)) { console.error("Not an dimension id! " + dimensionId); return null; };
        return getDimensions().find(d => d.id == dimensionId)
    }

    function getDimensions() {
        return mDimensions;
    }

    function getDimenstionForCategory(categoryId) {
        if (!IdUtil.isType(categoryId, Data.Category)) { console.error("Not a category id! " + categoryId); return null; };
        return getDimensions().find(d => d.categories.some(l => l.id == categoryId))
    }

    function setDimensions(dimensions) {
        mDimensions = dimensions;
    }

    function getDimensionForCategory(categoryId) {
        if (!IdUtil.isType(categoryId, Data.Category)) { console.error("Not an category id! " + categoryId); return null; };
        return getDimensions().find(d => d.categories.some(l => l.id == categoryId));
    }

    function getCategory(categoryId) {
        if (!IdUtil.isType(categoryId, Data.Category)) { console.error("Not an category id! " + categoryId); return null; };
        return getDimensions().map(d => d.categories).flat().find(l => l.id == categoryId);
    }

    function getCategories() {
        return getDimensions().map(d => {
            if (d.type == DimensionType.DISCRETE) {
                return d.categories;
            } else {
                return []
            }
        }).flat();
    }

    function getCategoryForElement(dimensionId, elementId) {
        let dimension = getDimension(dimensionId);
        if (!dimension) return null;
        return dimension.categories.find(l => l.elementIds.includes(elementId));
    }

    function getTables() {
        let dimensions = mDimensions
            .filter(d => DataUtil.dimensionValid(d))
            .filter(d => d.type == DimensionType.DISCRETE || DataUtil.domainIsValid(d.domain));
        if (dimensions.length == 0) return [];

        let tableCells = []
        mElements.forEach(element => {
            let level = DataUtil.getLevelForElement(element.id, this)
            dimensions.filter(d => d.level == level).forEach(dimension => {
                let value = DataUtil.getMappedValue(this, dimension.id, element.id);
                if (typeof value == "number") { value = Math.round(value * 100) / 100 }
                if (value || value === 0) {
                    tableCells.push({
                        elementId: element.id,
                        dimensionId: dimension.id,
                        value: value,
                        level: level,
                    })
                }
            })
        });

        let parents = DataUtil.unique(mElements.map(e => e.parentId).filter(p => p));
        let tableElements = DataUtil.unique(tableCells.map(c => c.elementId));
        let leafs = mElements.filter(e => tableElements.includes(e.id) && !parents.includes(e.id));

        let rows = []
        leafs.forEach(leaf => {
            let rowData = [];
            let nextId = leaf.id;
            while (nextId) {
                rowData.push(...tableCells.filter(c => c.elementId == nextId))
                let element = getElement(nextId);
                nextId = element.parentId;
            }
            let key = rowData.map(c => { return { id: c.dimensionId, level: c.level } })
                .sort(DataUtil.compareDimensions)
                .map(c => c.id).join(",");
            rows.push({ key, rowData });
        })

        let tables = {};
        rows.forEach(({ key, rowData }) => {
            if (!tables[key]) {
                tables[key] = new DataTable();
                rowData.map(c => c.dimensionId).forEach(id => {
                    let dimension = dimensions.find(d => d.id == id);
                    tables[key].addColumn(id, dimension.name, dimension.level);
                })
            }
        })

        // do this by table so we get good indexes for the rows
        Object.keys(tables).forEach(tableKey => {
            rows.filter(r => r.key == tableKey).forEach(({ key, rowData }, index) => {
                rowData.forEach(tableCell => {
                    tables[key].addCell(tableCell.dimensionId, index, tableCell.elementId, tableCell.value)
                })
            });
        })

        return Object.values(tables);
    }

    function getTree() {
        let elements = getElements();
        let addChildren = function (container) {
            container.children = elements.filter(e => e.parentId == container.id).map(e => { return { id: e.id } });
            container.children.forEach(child => addChildren(child));
        }

        let root = { children: getElements().filter(e => !e.parentId).map(e => { return { id: e.id } }) };
        root.children.forEach(child => addChildren(child));

        return root;
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
        getElementMappedValues,
        getElementChildren,
        getDimension,
        getDimensions,
        getDimenstionForCategory,
        setDimensions,
        getDimensionForCategory,
        getCategory,
        getCategories,
        getCategoryForElement,
        getTables,
        getTree,
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

export function DataTable() {
    let mColumns = []
    let mRows = []

    function addColumn(colId, name, level) {
        if (mColumns.find(c => c.id == colId)) return;
        mColumns.push({ id: colId, name, level });
        mColumns.sort(DataUtil.compareDimensions)
    }

    function addCell(colId, rowIndex, id, value) {
        let colIndex = mColumns.findIndex(c => c.id == colId)
        if (colIndex == -1) { console.error("Invalid column id, cell not added", colId); return; }
        if (!mRows[rowIndex]) mRows[rowIndex] = [];
        mRows[rowIndex].push({ id, value, colId });
    }

    function getColumns() {
        return [...mColumns]
    }

    function getDataArray() {
        return mRows.map(row => mColumns.map(col => {
            let cell = row.find(cell => cell.colId == col.id)
            return {
                id: cell.id,
                value: cell.value
            }
        }));
    }

    this.getColumns = getColumns;
    this.addColumn = addColumn;
    this.addCell = addCell;
    this.getDataArray = getDataArray;
}
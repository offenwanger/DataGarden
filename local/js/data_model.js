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

    function getDimension(dimensionId) {
        if (!IdUtil.isType(dimensionId, Data.Dimension)) { console.error("Not an dimension id! " + dimensionId); return null; };
        return getDimensions().find(d => d.id == dimensionId)
    }

    function getDimensions() {
        return mDimensions;
    }

    function getDimenstionForLevel(levelId) {
        if (!IdUtil.isType(levelId, Data.Level)) { console.error("Not a level id! " + levelId); return null; };
        return getDimensions().find(d => d.levels.some(l => l.id == levelId))
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

    function getLevels() {
        return getDimensions().map(d => {
            if (d.type == DimensionType.DISCRETE) {
                return d.levels;
            } else {
                return []
            }
        }).flat();
    }

    function getLevelForElement(dimensionId, elementId) {
        let dimension = getDimension(dimensionId);
        if (!dimension) return null;
        return dimension.levels.find(l => l.elementIds.includes(elementId));
    }

    function getTables() {
        let dimensions = mDimensions.filter(d => DataUtil.dimensionValid(d));
        if (dimensions.length == 0) return [];

        let values = {}
        mElements.forEach(element => {
            let tier = DataUtil.getTier(this, element.id)
            values[element.id] = {}
            dimensions.filter(d => d.tier == tier).forEach(dimension => {
                let value = DataUtil.getMappedValue(this, dimension.id, element.id);
                if (typeof value == "number") { value = Math.round(value * 100) / 100 }
                if (value) values[element.id][dimension.id] = value;
            })
        })

        let tableElements = mElements.filter(e => Object.keys(values[e.id]).length > 0);
        let parents = DataUtil.unique(tableElements.map(e => e.parentId).filter(p => p));
        let leafs = tableElements.filter(e => !parents.includes(e.id));

        let rows = []
        leafs.forEach(leaf => {
            let row = {};
            let nextId = leaf.id;
            let level = DataUtil.getTier(this, leaf.id);
            while (nextId) {
                let element = getElement(nextId);
                Object.entries(values[nextId]).forEach(([dimenId, value]) => {
                    row[dimenId] = { id: nextId, value };
                });
                level--;
                nextId = element.parentId;
            }
            rows.push(row);
        })

        let tables = splitTable(dimensions, rows);
        return tables;
    }

    function splitTable(dimensions, rows) {
        let dimenTiers = {}
        dimensions.forEach(dimen => dimenTiers[dimen.id] = dimen.tier);

        let tables = {}
        rows.forEach(row => {
            let key = getRowKey(row, dimenTiers);
            if (!tables[key]) tables[key] = { cols: Object.keys(row), rows: [] };;
            tables[key].rows.push(row);
        });

        return Object.values(tables);
    }

    function getRowKey(row, dimensionsTiers) {
        return Object.keys(row).sort((a, b) => {
            if (dimensionsTiers[a] == dimensionsTiers[b]) {
                return a.localeCompare(b, 'en', { numeric: true });
            } else {
                return dimensionsTiers[a] - dimensionsTiers[b];
            }
        }).concat(',');
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
        getElementChildren,
        getDimension,
        getDimensions,
        getDimenstionForLevel,
        setDimensions,
        getDimensionForLevel,
        getLevel,
        getLevels,
        getLevelForElement,
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
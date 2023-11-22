function DataModel() {
    let mGroups = [];
    let mDimentions = [];

    function clone() {
        let clone = new DataModel();
        clone.setGroups(getGroups().map(e => e.clone()));
        clone.setDimentions(getDimentions().map(e => e.clone()));
        return clone;
    }

    function toObject() {
        let model = this.clone();
        return {
            groups: model.getGroups(),
            dimentions: model.getDimentions()
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
        return getGroups().map(g => g.elements).flat();
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

    function getGroup(groupId) {
        if (!IdUtil.isType(groupId, Data.Group)) { console.error("Not an group id! " + groupId); return null; };
        return getGroups().find(g => g.id == groupId)
    }

    function getGroupForElement(elementId) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Not an element id! " + elementId); return null; };
        return getGroups().find(g => g.elements.some(e => e.id == elementId));
    }

    function getGroupDecendants(groupId) {
        if (!IdUtil.isType(groupId, Data.Group)) { console.error("Not an group id! " + groupId); return null; };
        let groups = [];
        let groupQueue = [getGroup(groupId)];
        let allGroups = getGroups();
        while (groupQueue.length > 0) {
            let group = groupQueue.shift();
            groups.push(group);
            groupQueue.push(...allGroups.filter(g => g.parentId == group.id));
        }
        return groups;
    }

    function getGroups() {
        return mGroups;
    }

    function setGroups(groups) {
        mGroups = groups;
    }

    function getDimention(dimentionId) {
        if (!IdUtil.isType(dimentionId, Data.Dimention)) { console.error("Not an dimention id! " + dimentionId); return null; };
        return getDimentions().find(d => d.id == dimentionId)
    }

    function getDimentions() {
        return mDimentions;
    }

    function setDimentions(dimentions) {
        mDimentions = dimentions;
    }

    function getDimentionForLevel(levelId) {
        if (!IdUtil.isType(levelId, Data.Level)) { console.error("Not an level id! " + levelId); return null; };
        return getDimentions().find(d => d.levels.some(l => l.id == levelId));
    }

    function getLevel(levelId) {
        if (!IdUtil.isType(levelId, Data.Level)) { console.error("Not an level id! " + levelId); return null; };
        return getDimentions().map(d => d.levels).flat().find(l => l.id == levelId);
    }

    function getLevelForElement(dimentionId, elementId) {
        let dimention = getDimention(dimentionId);
        if (!dimention) return null;
        return dimention.levels.find(l => l.elementIds.includes(elementId));
    }

    function getTables() {
        // get the top level groups, there's one table for each
        return mGroups.filter(g => !g.parentId).map(group => {
            // get the dimentions for this table
            let dimentions = getGroupDecendants(group.id).map(g => {
                let mapping = mMappings.find(m => m.groupId == g.id);
                if (mapping) {
                    return getDimention(mapping.dimentionId);
                } else return null;
            }).filter(d => d);
            if (!dimentions) return null;
            let dimenToIndex = {};
            dimentions.forEach((d, index) => {
                dimenToIndex[d.id] = index;
            });

            let table = [];
            // add the header row
            table.push(dimentions.map(d => d.name));
            let rows = group.elements.map(e => getRows(e, getElements())).flat();
            rows.forEach(row => {
                let tableRow = [new Array(dimentions.length).map(i => null)];
                Object.entries(row).forEach(([dimenId, value]) => {
                    tableRow[dimenToIndex[dimenId]] = value;
                });
                table.push(tableRow);
            })
            return table;
        }).filter(t => t);
    }

    // recursive function
    function getRows(element, allElements) {
        console.error("impliment me!"); return;
        let rows = allElements.filter(e => e.parentId == element.id).map(e => getRows(e, allElements)).flat();
        let group = getGroupForElement(element.id);
        let mappings = mMappings.filter(m => m.groupId == group.id);
        let values = mappings.map(mapping => DataUtil.getValue(element, mapping, getDimention(mapping.dimentionId)));
        if (mappings.length == 0 || values.filter(v => v).length == 0) {
            return rows;
        } else {
            if (rows.length == 0) {
                let row = {};
                mappings.forEach((m, index) => { if (values[index]) row[m.dimentionId] = values[index] })
                return [row];
            } else {
                rows.forEach(row => mappings.forEach((m, index) => { if (values[index]) row[m.dimentionId] = values[index] }));
                return rows;
            }
        }
    }

    this.clone = clone;
    this.toObject = toObject;
    this.getStroke = getStroke;
    this.getStrokes = getStrokes;
    this.getElement = getElement;
    this.getElementForStroke = getElementForStroke;
    this.getElements = getElements;
    this.getElementDecendants = getElementDecendants;
    this.getElementChildren = getElementChildren;
    this.getGroup = getGroup;
    this.getGroupForElement = getGroupForElement;
    this.getGroups = getGroups;
    this.setGroups = setGroups;
    this.getDimention = getDimention;
    this.getDimentions = getDimentions;
    this.setDimentions = setDimentions;
    this.getDimentionForLevel = getDimentionForLevel;
    this.getLevel = getLevel;
    this.getLevelForElement = getLevelForElement;
    this.getTables = getTables;
}

DataModel.fromObject = function (obj) {
    let model = new DataModel();
    if (!Array.isArray(obj.groups) || !Array.isArray(obj.dimentions)) {
        console.error("Invalid data model object", obj);
        return;
    }
    model.setGroups(obj.groups.map(g => Data.Group.fromObject(g)));
    model.setDimentions(obj.dimentions.map(d => Data.Dimention.fromObject(d)));
    return model;
}
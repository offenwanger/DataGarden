let Fairies = function () {
    function strokeFairy(stroke, modelController) {
        // Make a decision about how to update the model for a new stroke. 
        // Right now these fairies only handle new elements, but they'll need to handle changes to. 

        // Right now just make the dumb decision to create a new element every time.
        let boundingBox = DataUtil.getBoundingBox(stroke);

        let elem = new Data.Element(boundingBox.x, boundingBox.y);
        stroke.path = PathUtil.translate(stroke.path, { x: -boundingBox.x, y: -boundingBox.y })
        elem.strokes.push(stroke);

        newElementFairy(elem, modelController);
    }

    function newElementFairy(elem, modelController) {
        // this Fairies is responsible for setting new element values
        let model = modelController.getModel();

        elementVemPositionFairy(elem, model);

        let group = model.getGroups().find(g => g.elements.some(e => e.parentId == elem.parentId));
        if (!group) {
            group = new Data.Group();
            group.elements.push(elem);
            newGroupFairy(group, modelController);
        } else {
            modelController.addElement(group.id, elem);
        }
    }

    function elementVemPositionFairy(element, model) {
        // if the num is not set, set it. 
        if (!ValUtil.isNum(element.vemX) || !ValUtil.isNum(element.vemY)) {
            if (element.parentId) {
                let parent = model.getElement(element.parentId);
                element.vemY = parent.vemY + 90;
                element.vemX = parent.vemX;
            } else {
                element.vemY = 10;
                element.vemX = 10;
            }
        }

        // it's dump and just parks it to the right.
        element.vemX = Math.max(element.vemX, ...model.getElements()
            .filter(e => e.id != element.id)
            .filter(e => e.vemY > element.vemY - 70 && e.vemY < element.vemY + 70)
            .map(e => e.vemX + 70));
    }

    function newGroupFairy(group, modelController) {
        // this fairy is responsible for setting values on new groups.
        groupStructPositionFairy(group, modelController.getModel())
        modelController.addGroup(group);
    }

    function groupStructPositionFairy(group, model) {
        // if the struct position is not set, set it. 
        if (!ValUtil.isNum(group.structX) || !ValUtil.isNum(group.structY)) {
            if (group.parentId) {
                let parent = model.getGroup(group.parentId);
                group.structY = parent.structY + 140;
                group.structX = parent.structX;
            } else {
                group.structY = 10;
                group.structX = 10;
            }
        }

        // it's dump and just parks it to the right.
        group.structX = Math.max(group.structX, ...model.getGroups()
            .filter(g => g.id != group.id)
            .filter(g => g.structY > group.structY - 140 && g.structY < group.structY + 140)
            .map(g => g.structX + 140));
    }

    function elementMergeFairy(elementIds, mergeTargetId, modelController) {
        let model = modelController.getModel();
        let strokes = model.getStrokesInLocalCoords(elementIds.concat([mergeTargetId]));
        let bb = DataUtil.getBoundingBox(strokes);
        let mergeTarget = model.getElement(mergeTargetId);
        let mergeTargetGroup = model.getGroupForElement(mergeTargetId);

        let elementGroupIds = elementIds.map(eId => model.getGroupForElement(eId).id)
            .filter((id, index, array) => array.indexOf(id) === index);

        mergeTarget.x = bb.x;
        mergeTarget.y = bb.y;
        strokes.forEach(stroke => {
            stroke.path = PathUtil.translate(stroke.path, { x: -bb.x, y: -bb.y })
        })
        mergeTarget.strokes = strokes;

        elementIds.forEach(elementId => {
            modelController.removeElement(elementId);
        });
        modelController.removeElement(mergeTargetId);
        modelController.addElement(mergeTargetGroup.id, mergeTarget);

        model = modelController.getModel();
        elementGroupIds.forEach(groupId => {
            if (model.getGroup(groupId).elements.length == 0) {
                modelController.removeGroup(groupId);
            }
        })
    }

    function elementParentFairy(elementIds, parentTargetId, modelController) {
        let model = modelController.getModel();
        let elements = model.getElements().filter(e => elementIds.includes(e.id));
        let parentGroup = model.getGroupForElement(parentTargetId);
        let childGroups = model.getGroups().filter(g => g.parentId == parentGroup.id);

        let elementGroupIds = elementIds.map(eId => model.getGroupForElement(eId).id)
            .filter((id, index, array) => array.indexOf(id) === index);

        elements.forEach(element => {
            element.parentId = parentTargetId;
            element.vemX = null;
            element.vemY = null;
            elementVemPositionFairy(element, model);

            let group = model.getGroupForElement(element.id);
            modelController.removeElement(element.id);
            if (childGroups.some(g => g.id == group.id)) {
                // the group is fine and doesn't need to change. 
            } else {
                // We need a new group. 
                if (childGroups.length == 0) {
                    group = new Data.Group();
                    group.parentId = parentGroup.id;
                    childGroups.push(group);
                    newGroupFairy(group, modelController);
                } else {
                    // just be dump and pick the first one. 
                    group = childGroups[0];
                }
            }
            modelController.addElement(group.id, element);
        });

        model = modelController.getModel();
        elementGroupIds.forEach(groupId => {
            if (model.getGroup(groupId).elements.length == 0) {
                modelController.removeGroup(groupId);
            }
        })
    }

    return {
        strokeFairy,
        elementMergeFairy,
        elementParentFairy,
    }
}();
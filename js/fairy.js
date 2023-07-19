let Fairies = function () {
    function strokeFairy(stroke, modelController) {
        // Make a decision about how to update the model for a new stroke. 
        // Right now these fairies only handle new elements, but they'll need to handle changes to. 

        // Right now just make the dumb decision to create a new element every time.
        let boundingBox = DataUtil.getBoundingBox(stroke);

        let elem = new Data.Element(boundingBox.x, boundingBox.y);
        stroke.path = PathUtil.translate(stroke.path, { x: -boundingBox.x, y: -boundingBox.y })
        elem.strokes.push(stroke);

        elementFairy(elem, modelController);
    }

    function elementFairy(elem, modelController) {
        // this Fairies is responsible for setting new element values
        let model = modelController.getModel();

        // it's also dump and just parks it to the right.
        elem.vemY = 10;
        elem.vemX = Math.max(10, ...model.getElements()
            .filter(e => e.id != elem.id)
            .filter(e => e.vemY > -60 && e.vemY < 80)
            .map(e => e.vemX + 70));

        let group = model.getGroups().find(g => g.elements.some(e => e.parent == elem.parent));
        if (!group) {
            group = new Data.Group();
            group.elements.push(elem);
            groupFairy(group, modelController);
        } else {
            modelController.addElement(group.id, elem);
        }
    }

    function groupFairy(group, modelController) {
        // this fairy is responsible for setting values on new groups.

        // it's also dump and just parks it to the right.
        group.structX = 10;
        group.structY = Math.max(10, ...modelController.getModel().getGroups()
            .filter(g => g.id != group.id)
            .filter(g => g.structY > -120 && g.structY < 160)
            .map(g => g.structX + 140));

        modelController.addGroup(group);
    }

    function elementMergeFairy(elementIds, mergeTargetId, modelController) {
        let model = modelController.getModel();
        let strokes = model.getStrokesInLocalCoords(elementIds.concat([mergeTargetId]));
        let bb = DataUtil.getBoundingBox(strokes);
        let mergeTarget = model.getElement(mergeTargetId);
        let mergeTargetGroup = model.getGroupForElement(mergeTargetId);

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
    }

    return {
        strokeFairy,
        elementMergeFairy,
    }
}();
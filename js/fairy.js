let Fairies = function () {
    function strokeFairy(stroke, modelController) {
        // Make a decision about how to update the model for a new stroke. 
        // Right now these fairies only handle new elements, but they'll need to handle changes to. 

        // Right now just make the dumb decision to create a new element every time.
        let boundingBox = PathUtil.getBoundingBox(stroke.path);

        boundingBox.x -= stroke.size / 2
        boundingBox.y -= stroke.size / 2
        boundingBox.height += stroke.size
        boundingBox.width += stroke.size

        let elem = new Data.Element(boundingBox.x, boundingBox.y, boundingBox.height, boundingBox.width);
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

    return {
        strokeFairy,
    }
}();
let Fairy = function () {
    function doMagic(stroke, modelController) {
        // Make a decision about how to update the model

        // Right now just make the dumb decision to create a new element every time.
        let boundingBox = PathUtil.getBoundingBox(stroke.path);

        boundingBox.x -= stroke.size / 2
        boundingBox.y -= stroke.size / 2
        boundingBox.height += stroke.size
        boundingBox.width += stroke.size

        let elem = new Data.Element(boundingBox.x, boundingBox.y, boundingBox.height, boundingBox.width);

        stroke.path = PathUtil.translate(stroke.path, { x: -boundingBox.x, y: -boundingBox.y })
        elem.strokes.push(stroke);

        let vemPlace = getPlaceForElementInVem(elem, modelController.getModel());
        elem.vemX = vemPlace.x;
        elem.vemY = vemPlace.y;

        modelController.addElement(elem);
    }

    function getPlaceForElementInVem(elem, model) {
        // this fairy is also dump and just parks it to the right.
        let y = 10;
        let x = Math.max(10, ...model.getElements().filter(e => e.id != elem.id).filter(e => e.vemY > -60 && e.vemY < 80).map(e => e.vemX + 70));
        return { x, y };
    }

    return {
        doMagic,
    }
}();
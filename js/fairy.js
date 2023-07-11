let Fairy = function () {
    function doMagic(stroke, modelController) {
        // Make a decision about how to update the model
        modelController.newElement(stroke);
    }

    return {
        doMagic,
    }
}();
let ModelUtil = function () {
    function updateParent(parentElementId, elementId, modelController) {
        if (parentElementId == elementId) { console.error("Can't parent a node to itself! " + parentElementId); return; }
        let model = modelController.getModel();
        let element = model.getElement(elementId);
        if (!element) { console.error("invalid element id"); return; }

        let parentElement;
        if (parentElementId) { parentElement = model.getElement(parentElementId); }
        if (parentElementId && !parentElement) { console.error("invalid element id"); return; }

        if (DataUtil.isDecendant(elementId, parentElementId, model)) {
            updateParent(element.parentId, parentElementId, modelController);
            model = modelController.getModel();
        }

        if (parentElement) {
            let closestPosition = PathUtil.getClosestPointOnPath(element.root, parentElement.spine);
            element.position = closestPosition.percent;
        }

        element.parentId = parentElementId;
        modelController.updateElement(element);
    }

    function mergeElements(modelController, elements, target) {
        elements.forEach(elementId => {
            let element = modelController.getModel().getElement(elementId);
            let children = modelController.getModel().getElementChildren(elementId);
            children.forEach(child => {
                if (child.id == target) {
                    ModelUtil.updateParent(element.parentId, target, modelController);
                } else {
                    ModelUtil.updateParent(target, child.id, modelController);
                }
            })
            // handle an edge case where the merge element is a grandchild of this element
            // it might have been set to this element when updating this elements children
            if (modelController.getModel().getElementChildren(elementId).length == 1) {
                ModelUtil.updateParent(element.parentId, target, modelController);
            }
            let mergeElement = modelController.getModel().getElement(target);
            mergeElement.strokes = mergeElement.strokes.concat(element.strokes);
            modelController.removeElement(elementId);
            modelController.updateElement(mergeElement);
        });
    }

    function clearEmptyElements(modelController) {
        let elements = modelController.getModel().getElements();
        let removeElementIds = elements.filter(e => e.strokes.length == 0).map(e => e.id);
        removeElementIds.forEach(id => modelController.removeElement(id));
        elements.filter(e => removeElementIds.includes(e.parentId) && !removeElementIds.includes(e.id)).forEach(e => {
            e.parentId = null;
            modelController.updateElement(e);
        });
    }

    return {
        updateParent,
        mergeElements,
        clearEmptyElements,
    }
}();
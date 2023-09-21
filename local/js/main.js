document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();

    let mStrokeViewController = new StrokeViewController();
    let mFdlViewController = new FdlViewController();

    mStrokeViewController.onResize(window.innerWidth * 0.5, window.innerHeight);
    mFdlViewController.onResize(window.innerWidth * 0.5, window.innerHeight);

    let mEventManager = new EventManager(mStrokeViewController, mFdlViewController);

    mStrokeViewController.setNewStrokeCallback((stroke) => {
        let model = mModelController.getModel();

        let element = new Data.Element();
        element.strokes.push(stroke);
        element.spine = ModelUtil.getStupidSpine(element);

        let group;
        if (model.getGroups().length == 0) {
            group = new Data.Group();
            group.elements.push(element);
            mModelController.addGroup(group);
        } else {
            mModelController.addElement(model.getGroups().find(g => !g.parentId).id, element);
        }

        modelUpdate();

        // ServerRequestUtil.getSpine(element).then(result => {
        //     if (result) {
        //         element = mModelController.getModel().getElement(element.id);
        //         element.spine = result;
        //         mModelController.updateElement(element);
        //     }
        // })
    })

    mStrokeViewController.setHighlightCallback((selection) => {
        mFdlViewController.highlight(selection);
    })

    mStrokeViewController.setSelectionCallback((selection) => {
        // selection could be strokes or elements
        // might select an entire element tree
    })

    mFdlViewController.setHighlightCallback((selection) => {
        mStrokeViewController.highlight(selection);
    })

    mFdlViewController.setParentElementCallback((elementId, parentElementId) => {
        ModelUtil.updateParent(parentElementId, elementId, mModelController)
        ModelUtil.clearEmptyGroups(mModelController);
        modelUpdate();
    })

    mFdlViewController.setMergeElementCallback((selection, mergeElementId) => {
        selection.forEach(elementId => {
            let element = mModelController.getModel().getElement(elementId);
            let children = mModelController.getModel().getElementChildren(elementId);
            children.forEach(child => {
                if (child.id == mergeElementId) {
                    ModelUtil.updateParent(element.parentId, mergeElementId, mModelController);
                } else {
                    ModelUtil.updateParent(mergeElementId, child.id, mModelController);
                }
            })
            // handle an edge case where the merge element is a grandchild of this element
            // it might have been set to this element when updating this elements children
            if (mModelController.getModel().getElementChildren(elementId).length == 1) {
                ModelUtil.updateParent(element.parentId, mergeElementId, mModelController);
            }
            let mergeElement = mModelController.getModel().getElement(mergeElementId);
            mergeElement.strokes = mergeElement.strokes.concat(element.strokes);
            mModelController.removeElement(elementId);
            mModelController.updateElement(mergeElement);
        });
        ModelUtil.clearEmptyGroups(mModelController);
        modelUpdate();
    })

    mFdlViewController.setNewElementCallback((groupId, childStrokeId) => {
        let stroke = mModelController.getModel().getStroke(childId);
        let element = new Data.Element();
        element.strokes.push(stroke);
        element.spine = ModelUtil.getStupidSpine(element);
        mModelController.removeStroke(childStrokeId);
        mModelController.addElement(groupId, element);

        modelUpdate();
    })

    mFdlViewController.setMoveElementCallback((groupId, elementId) => {
        let element = mModelController.getModel().getElement(elementId);
        mModelController.removeElement(elementId);
        mModelController.addElement(groupId, element);
        modelUpdate();
    })

    mFdlViewController.setMoveStrokeCallback((elementId, strokeId) => {
        let stroke = mModelController.getModel().getStroke(strokeId);
        mModelController.removeStroke(stroke);
        mModelController.addStroke(elementId, stroke);
        modelUpdate();
    })

    mFdlViewController.setNewGroupCallback((childId) => {
        let element;
        if (IdUtil.isType(childId, Data.Stroke)) {
            let stroke = mModelController.getModel().getStroke(childId);
            element = new Data.Element();
            element.strokes.push(stroke);
            element.spine = ModelUtil.getStupidSpine(element);

            mModelController.removeStroke(childId);
        } else if (IdUtil.isType(childId, Data.Element)) {
            element = mModelController.getModel().getElement(childId);

            mModelController.removeElement(childId);
        } else { console.error("invalid id", childId); return; }

        let group = new Data.Group();
        group.elements.push(element);
        mModelController.addGroup(group);

        modelUpdate();
    })


    function modelUpdate() {
        let model = mModelController.getModel();
        mStrokeViewController.onModelUpdate(model);
        mFdlViewController.onModelUpdate(model);
    }
});
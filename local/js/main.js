document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();

    let mStrokeViewController = new StrokeViewController();
    let mFdlViewController = new FdlViewController();

    mStrokeViewController.onResize(window.innerWidth * 0.5, window.innerHeight);
    mFdlViewController.onResize(window.innerWidth * 0.5, window.innerHeight);

    let mEventManager = new EventManager(mStrokeViewController, mFdlViewController);

    mStrokeViewController.setNewStrokeCallback((stroke) => {
        let model = mModelController.getModel();

        let element = ModelUtil.wrapStrokeInElement(stroke);
        element.spine = ModelUtil.getStupidSpine(element);
        let vemPos = ModelUtil.getVemPosition(element, model);
        element.vemX = vemPos.x;
        element.vemY = vemPos.y;

        let group;
        if (model.getGroups().length == 0) {
            group = new Data.Group();
            group.elements.push(element);
            let structPos = ModelUtil.getStructPosition(group, model)
            group.structX = structPos.x;
            group.structY = structPos.y;
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
        // update the Vem and Struct selections
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
            mergeElement = ModelUtil.mergeStrokes(mergeElement, element);
            mModelController.removeElement(elementId);
            mModelController.updateElement(mergeElement);
        });
        ModelUtil.clearEmptyGroups(mModelController);
        modelUpdate();
    })

    function modelUpdate() {
        let model = mModelController.getModel();
        mStrokeViewController.onModelUpdate(model);
        mFdlViewController.onModelUpdate(model);
    }
});
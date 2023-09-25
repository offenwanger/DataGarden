document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();

    let mStrokeViewController = new StrokeViewController();
    let mFdlViewController = new FdlViewController();

    mStrokeViewController.onResize(window.innerWidth * 0.5, window.innerHeight);
    mFdlViewController.onResize(window.innerWidth * 0.5, window.innerHeight);

    let mEventManager = new EventManager(mStrokeViewController, mFdlViewController);
    let mCallingDelay = 0;

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

        clearTimeout(mCallingDelay);
        mCallingDelay = setTimeout(() => {
            ServerRequestUtil.suggestGrouping(mModelController.getModel().getElements()).then(grouping => {
                let group = grouping.find(g => g.includes(stroke.id));
                let model = mModelController.getModel();
                let elements = DataUtil.unique(group.map(s => model.getElementForStroke(s))).filter(e => e);
                let oldestElement = elements.reduce((prev, cur) => (cur.creationTime < prev.creationTime) ? cur : prev);
                ModelUtil.mergeElements(mModelController, elements.map(e => e.id).filter(id => id != oldestElement.id), oldestElement.id);
                modelUpdate();
            });
        }, 2000);

        ServerRequestUtil.getSpine(element).then(result => {
            if (result) {
                element = mModelController.getModel().getElement(element.id);
                element.spine = result;
                mModelController.updateElement(element);
            }
        })
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
        ModelUtil.mergeElements(mModelController, selection, mergeElementId);
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
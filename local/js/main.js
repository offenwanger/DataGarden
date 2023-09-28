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
                let elements = mModelController.getModel().getElements();

                // reconcile the algorithm results with the curdrent state. 
                let elementStrips = elements.map(element => {
                    return {
                        id: element.id,
                        strips: DataUtil.unique(element.strokes.map(s => grouping.findIndex(g => g.includes(s.id))))
                    }
                });

                let singletons = elementStrips.filter(s => s.strips.length == 1);
                let nonSingletons = elementStrips.filter(s => s.strips.length > 1)

                nonSingletons.forEach(elementData => {
                    elementData.strips.forEach(sId => {
                        let mergies = singletons.filter(s => s.strips[0] == sId).map(ed => ed.id);
                        singletons = singletons.filter(s => s.strips[0] != sId);
                        ModelUtil.mergeElements(mModelController, mergies, elementData.id);
                    })
                })

                let mergeGroups = {};
                singletons.forEach(elementData => {
                    if (!mergeGroups[elementData.strips[0]]) mergeGroups[elementData.strips[0]] = [];
                    mergeGroups[elementData.strips[0]].push(elementData.id);
                });
                Object.values(mergeGroups).forEach(group => {
                    if (group.length > 1) {
                        let groupElements = elements.filter(e => group.includes(e.id));
                        let oldestElement = groupElements.reduce((prev, cur) => (cur.creationTime < prev.creationTime) ? cur : prev);
                        ModelUtil.mergeElements(mModelController, groupElements.map(e => e.id).filter(id => id != oldestElement.id), oldestElement.id);
                    }
                });
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
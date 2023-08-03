document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();

    let mStrokeViewController = new StrokeViewController();
    let mVemViewController = new VemViewController();
    let mStructViewController = new StructViewController();

    mStrokeViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);
    mVemViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);
    mStructViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);

    let mEventManager = new EventManager(mStrokeViewController, mVemViewController, mStructViewController);

    mStrokeViewController.setStrokeCallback((stroke) => {
        Fairies.strokeFairy(stroke, mModelController);
        modelUpdate();
    })

    mStrokeViewController.setHighlightCallback((selection) => {
        mVemViewController.highlight(selection);
        mStructViewController.highlight(selection);
    })

    mStrokeViewController.setSelectionCallback((selection) => {
        // selection could be strokes or elements
        // might select an entire element tree
        // update the Vem and Struct selections
    })

    mVemViewController.setMoveElementCallback((selection, translation) => {
        let elements = mModelController.getModel().getElements().filter(e => selection.includes(e.id))
        elements.forEach(element => {
            element.vemX = element.vemX + translation.x;
            element.vemY = element.vemY + translation.y;
            mModelController.updateElement(element);
        })
        modelUpdate();
    })

    mVemViewController.setMergeElementCallback((selection, mergeElementId) => {
        Fairies.elementMergeFairy(selection, mergeElementId, mModelController);
        modelUpdate();
    })

    mVemViewController.setParentElementCallback((selection, parentElementId) => {
        Fairies.elementParentFairy(selection, parentElementId, mModelController);
        modelUpdate();
    })

    mVemViewController.setSelectionCallback((selection) => {
        // selections could be strokes or elements. 
        // Update the stroke and Struct selections
    })

    mVemViewController.setHighlightCallback((selection) => {
        mStrokeViewController.highlight(selection);
        mStructViewController.highlight(selection);
    })


    mStructViewController.setSelectionCallback((selection) => {
        // selectsions could be groups or elements. Update the 
        // Vem and Stroke selections
    })

    mStructViewController.setHighlightCallback((selection) => {
        mStrokeViewController.highlight(selection);
        mVemViewController.highlight(selection);
    })

    mStructViewController.setDimentionCreationCallback((coords) => {
        let dimention = new Data.Dimention();
        dimention.structX = coords.x;
        dimention.structY = coords.y;
        Fairies.dimentionStructPositionFairy(dimention, mModelController.getModel());
        mModelController.addDimention(dimention);
        modelUpdate();
    })

    mStructViewController.setMoveObjectsCallback((objects, translation) => {
        let model = mModelController.getModel();
        objects.filter(i => IdUtil.isType(i, Data.Dimention))
            .forEach(dimentionId => {
                let dimention = model.getDimention(dimentionId);
                dimention.structX += translation.x;
                dimention.structY += translation.y;
                mModelController.updateDimention(dimention);
            })
        objects.filter(i => IdUtil.isType(i, Data.Group))
            .forEach(groupId => {
                let group = model.getGroup(groupId);
                group.structX += translation.x;
                group.structY += translation.y;
                mModelController.updateGroup(group);
            })
        modelUpdate();
    })

    mStructViewController.setLinkCallback((groupId, dimentionId, channelType) => {
        Fairies.newMappingFairy(groupId, dimentionId, channelType, mModelController);
        modelUpdate();
    })




    function modelUpdate() {
        let model = mModelController.getModel();
        mStrokeViewController.onModelUpdate(model);
        mVemViewController.onModelUpdate(model);
        mStructViewController.onModelUpdate(model);
    }
});
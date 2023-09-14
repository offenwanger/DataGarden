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

    function modelUpdate() {
        let model = mModelController.getModel();
        mStrokeViewController.onModelUpdate(model);
        mFdlViewController.onModelUpdate(model);
    }
});
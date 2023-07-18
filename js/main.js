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
            mModelController.updateElementVemPosition(element.id, element.vemX + translation.x, element.vemY + translation.y);
        })
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


    function modelUpdate() {
        let model = mModelController.getModel();
        mStrokeViewController.onModelUpdate(model);
        mVemViewController.onModelUpdate(model);
        mStructViewController.onModelUpdate(model);
    }
});
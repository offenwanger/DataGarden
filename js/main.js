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

    function modelUpdate() {
        let model = mModelController.getModel();
        mStrokeViewController.onModelUpdate(model);
        mVemViewController.onModelUpdate(model);
        mStructViewController.onModelUpdate(model);
    }
});
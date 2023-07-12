document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();

    let mStrokeViewController = new StrokeViewController();
    let mVemViewController = new VemViewController();

    mStrokeViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);
    mVemViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);

    let mEventManager = new EventManager(mStrokeViewController, mVemViewController);

    mStrokeViewController.setStrokeCallback((stroke) => {
        Fairy.doMagic(stroke, mModelController);
        modelUpdate();
    })

    function modelUpdate() {
        let model = mModelController.getModel();
        mStrokeViewController.onModelUpdate(model);
        mVemViewController.onModelUpdate(model);
    }
});
document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();

    let mStrokeViewController = new StrokeViewController();
    mStrokeViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);

    let mEventManager = new EventManager(mStrokeViewController);

    mStrokeViewController.setStrokeCallback((stroke) => {
        Fairy.doMagic(stroke, mModelController);
        modelUpdate();
    })

    function modelUpdate() {
        mStrokeViewController.onModelUpdate(mModelController.getModel());
    }
});
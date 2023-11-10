
function DashboardController() {
    let mCanvasController = new CanvasController();
    let mFdlViewController = new FdlViewController();

    mCanvasController.onResize(window.innerWidth * 0.5, window.innerHeight);
    mFdlViewController.onResize(window.innerWidth * 0.5, window.innerHeight);

    function modelUpdate() {
        let model = mModelController.getModel();
        mCanvasController.onModelUpdate(model);
        mFdlViewController.onModelUpdate(model);
    }

    mCanvasController.setHighlightCallback((selection) => {
        mFdlViewController.highlight(selection);
    })

    mCanvasController.setSelectionCallback((selection) => {
        // selection could be strokes or elements
        // might select an entire element tree
        mVersionController.stack(selection);
    })

    mFdlViewController.setHighlightCallback((selection) => {
        mCanvasController.highlight(selection);
    })

    return {
        modelUpdate,
    }
}
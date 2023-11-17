function FdlDimentionViewController(mDrawingUtil, mCodeUtil) {
    const ADD_BUTTON_ID = 'add_button';

    let mModel = new DataModel();
    let mDimentionId = null;

    let mZoomTransform = d3.zoomIdentity.translate(0, 300);

    let mHighlight = [];

    let mLevels = [];
    let mAddButton = { id: ADD_BUTTON_ID, x: 0, y: 0 };

    let mLinks = [];

    let mSimulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id))
        .force("y", d3.forceY(0).strength(0.01))
        .force("collide", d3.forceCollide((d) => IdUtil.isType(d.id, Data.Dimention) ? Size.DIMENTION_SIZE : Size.LEVEL_SIZE))
        .alpha(0.3)
        .on("tick", () => {
            mSimulation.nodes().forEach(n => n.x = IdUtil.isType(n.id, Data.Dimention) ? DIMENTION_X : LEVEL_X);
            draw();
        })
        .stop();

    function updateSimulationData(data, model) {


        mSimulation.alphaTarget(0.3).restart();

        mModel = model;
    }

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

    }

    function stop() {
        mSimulation.stop();
    }

    function interactionStart(interaction, modelCoords) {

    }

    function interactionDrag(interaction, modelCoords) {

    }

    function interactionEnd(interaction, modelCoords) {

    }

    function pan(x, y) {
        mZoomTransform = d3.zoomIdentity.translate(0, y).scale(mZoomTransform.k);
        draw();
    }

    function zoom(x, y, scale) {
        mZoomTransform = d3.zoomIdentity.translate(0, y).scale(scale);
        draw();
    }

    function highlight(ids) {

    }

    function setDimention(dimentionId) {
        mDimentionId = dimentionId;
    }

    function getTranslate() {
        return { x: mZoomTransform.x, y: mZoomTransform.y };
    }

    function getScale() {
        return mZoomTransform.k;
    }

    return {
        updateSimulationData,
        stop,
        interactionStart,
        interactionDrag,
        interactionEnd,
        pan,
        zoom,
        highlight,
        setDimention,
        getTranslate,
        getScale,
    }
}
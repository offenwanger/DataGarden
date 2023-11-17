function FdlLegendViewController(mDrawingUtil, mCodeUtil) {
    const DIMENTION_X = 10;
    const LEVEL_X = 20;
    const ADD_BUTTON_ID = 'add_button';

    const DimentionLabels = {};
    DimentionLabels[DimentionType.DISCRETE] = 'disc';
    DimentionLabels[DimentionType.CONTINUOUS] = 'cont';

    const ChannelLabels = {};
    ChannelLabels[ChannelType.FORM] = 'form';
    ChannelLabels[ChannelType.COLOR] = 'color';
    ChannelLabels[ChannelType.SIZE] = 'size';
    ChannelLabels[ChannelType.ANGLE] = 'angle';
    ChannelLabels[ChannelType.POSITION] = 'pos';

    let mAddDimentionCallback = () => { };
    let mClickDimentionCallback = () => { };

    let mZoomTransform = d3.zoomIdentity.translate(0, 300);

    let mHighlight = [];

    let mDimentions = [];
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
        mDimentions = data.filter(d => IdUtil.isType(d.id, Data.Dimention));
        mLevels = data.filter(d => IdUtil.isType(d.id, Data.Level));
        mSimulation.nodes(mDimentions.concat(mLevels).concat([mAddButton]), (d) => d.id);

        mLinks = [];
        mLevels.forEach(level => {
            mLinks.push({ source: level.id, target: level.dimention });
        });

        mSimulation.force('link').links(mLinks);
        mSimulation.alphaTarget(0.3).restart();
    }

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        mDimentions.forEach(dimention => {
            let dimentionString = dimention.name +
                " [" + DimentionLabels[dimention.type] + "][" +
                ChannelLabels[dimention.channel] + "][T" + dimention.tier + "]";
            mDrawingUtil.drawStringNode(
                DIMENTION_X,
                dimention.y,
                dimentionString,
                Size.DIMENTION_SIZE,
                mHighlight.includes(dimention.id),
                mCodeUtil.getCode(dimention.id))
        })

        mLevels.forEach(level => {
            mDrawingUtil.drawStringNode(DIMENTION_X, level.y, level.name, Size.LEVEL_SIZE)
        })

        mDrawingUtil.drawStringNode(
            DIMENTION_X,
            mAddButton.y,
            "Add Dimention +",
            Size.DIMENTION_SIZE,
            mHighlight.includes(ADD_BUTTON_ID),
            mCodeUtil.getCode(ADD_BUTTON_ID));

    }

    function stop() {
        mSimulation.stop();
    }

    function interactionStart(interaction, modelCoords) {

    }

    function interactionDrag(interaction, modelCoords) {

    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.endTarget == interaction.target && interaction.target == ADD_BUTTON_ID) {
            mAddDimentionCallback();
        } else if (interaction.endTarget == interaction.target && IdUtil.isType(interaction.target, Data.Dimention)) {
            mClickDimentionCallback(interaction.target)
        }
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
        if (Array.isArray(ids) && ids.length > 0) {
            mHighlight = ids;
        } else if (ids) {
            mHighlight = [ids];
        } else {
            mHighlight = [];
        }
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
        getTranslate,
        getScale,
        setAddDimentionCallback: (func) => mAddDimentionCallback = func,
        setClickDimentionCallback: (func) => mClickDimentionCallback = func,
    }
}
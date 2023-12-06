function FdlLegendViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap) {
    const PADDING = 10;

    const ADD_BUTTON_ID = 'add_button';

    let mAddDimensionCallback = () => { };
    let mClickDimensionCallback = () => { };
    let mSelectionCallback = () => { };

    let mZoomTransform = d3.zoomIdentity.translate(0, 300);

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mDimensions = [];
    let mLevels = [];
    let mAddButton = { id: ADD_BUTTON_ID, x: 0, y: 0 };

    let mSimulation = d3.forceSimulation()
        .alphaDecay(Decay.ALPHA)
        .velocityDecay(Decay.VELOCITY)
        .alpha(0.3)
        .on("tick", () => {
            mSimulation.nodes().forEach(n => {
                n.x = IdUtil.isType(n.id, Data.Dimension) ? AxisPositions.DIMENSION_X : AxisPositions.LEVEL_X;
                let id = n.id;
                if (id == DimensionValueId.V1 || id == DimensionValueId.V2) id = n.dimension + n.id;
                n.y += (mYPositions[id] - n.y) * mSimulation.alpha();
            });
            draw();
        })
        .stop();

    function updateSimulationData(data, model) {
        mDimensions = data.filter(d => IdUtil.isType(d.id, Data.Dimension));
        mLevels = data.filter(d => IdUtil.isType(d.id, Data.Level) ||
            d.id == DimensionValueId.V2 ||
            d.id == DimensionValueId.V1);
        mSimulation.nodes(mDimensions.concat(mLevels).concat([mAddButton]), (d) => d.id);

        mYPositions = [];
        let curYPos = 0;
        let dimensions = model.getDimensions();
        dimensions.forEach(dimension => {
            mYPositions[dimension.id] = curYPos;
            curYPos += Size.DIMENSION_SIZE + PADDING;
            if (dimension.type == DimensionType.DISCRETE) {
                dimension.levels.forEach(level => {
                    mYPositions[level.id] = curYPos;
                    curYPos += Size.LEVEL_SIZE + PADDING;
                });
            } else if (dimension.type == DimensionType.CONTINUOUS) {
                mYPositions[dimension.id + DimensionValueId.V1] = curYPos;
                curYPos += Size.LEVEL_SIZE + PADDING;
                mYPositions[dimension.id + DimensionValueId.V2] = curYPos;
                curYPos += Size.LEVEL_SIZE + PADDING;
            }
        });

        mYPositions[ADD_BUTTON_ID] = curYPos;

        mSimulation.alphaTarget(0.3).restart();
    }

    function onHighlight(highlightedIds) {
        if (!highlightedIds || !Array.isArray(highlightedIds)) { mHighlightIds = []; return; }
        mHighlightIds = highlightedIds;
    }

    function onSelection(selectedIds) {
        if (!selectedIds || !Array.isArray(selectedIds)) { mSelectionIds = []; return; }
        mSelectionIds = selectedIds;
    }

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        mDimensions.forEach(dimension => {
            let dimensionString = dimension.name +
                " [" + DimensionLabels[dimension.type] + "][" +
                ChannelLabels[dimension.channel] + "][T" + dimension.tier + "]";
            mDrawingUtil.drawStringNode({
                x: dimension.x,
                y: dimension.y,
                label: dimensionString,
                height: Size.DIMENSION_SIZE,
                shadow: mHighlightIds.includes(dimension.id),
                code: mCodeUtil.getCode(dimension.id),
                outline: mSelectionIds.includes(dimension.id) ? mColorMap(dimension.id) : null,
            })
        })

        mLevels.forEach(level => {
            mDrawingUtil.drawStringNode({
                x: level.x,
                y: level.y,
                label: level.name,
                height: Size.LEVEL_SIZE,
                shadow: mHighlightIds.includes(level.id),
                code: mCodeUtil.getCode(level.id),
                outline: mSelectionIds.includes(level.id) ? mColorMap(level.id) : null,
            })
        })

        mDrawingUtil.drawStringNode({
            x: AxisPositions.DIMENSION_X,
            y: mAddButton.y,
            label: "Add Dimension +",
            height: Size.DIMENSION_SIZE,
            shadow: mHighlightIds.includes(ADD_BUTTON_ID),
            code: mCodeUtil.getCode(ADD_BUTTON_ID),
            outline: mSelectionIds.includes(ADD_BUTTON_ID) ? mColorMap(ADD_BUTTON_ID) : null,
        });

    }

    function start() {
        mSimulation.alphaTarget(0.3).restart();
    }

    function stop() {
        mSimulation.stop();
    }

    function interactionStart(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetTiles = mDimensions.concat(mLevels).filter(n => target.includes(n.id));
        let remainingTiles = mDimensions.concat(mLevels).filter(n => !target.includes(n.id));
        targetTiles.forEach(tile => {
            tile.startY = tile.y;
            tile.interacting = true;
        });

        mSimulation.nodes(remainingTiles);

    }

    function interactionDrag(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetTiles = mDimensions.concat(mLevels).filter(n => target.includes(n.id));
        let dist = VectorUtil.subtract(modelCoords, interaction.start);
        targetTiles.forEach(tile => {
            tile.y = tile.startY + dist.y;
        });
    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.type == FdlInteraction.SELECTION) {
            if (VectorUtil.dist(interaction.start, modelCoords) < 5) {
                // Handle Click
                if (interaction.endTarget.id == ADD_BUTTON_ID) {
                    mAddDimensionCallback();
                } else if (IdUtil.isType(interaction.endTarget.id, Data.Dimension)) {
                    mClickDimensionCallback(interaction.endTarget.id)
                }
            } else {
                let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
                    .map(target => target.id ? target.id : target);
                let targetTiles = mDimensions.concat(mLevels).filter(n => target.includes(n.id));
                targetTiles.forEach(tile => {
                    tile.startY = null;
                    tile.interacting = null;
                });

                mSimulation.nodes(mDimensions.concat(mLevels).concat([mAddButton]));
            }
        } else if (interaction.type == FdlInteraction.LASSO) {
            mOverlayUtil.reset(mZoomTransform);
            mOverlayUtil.drawBubble(interaction.path);
            let selectedIds = mDimensions.concat(mLevels).filter(obj => mOverlayUtil.covered(obj)).map(n => n.id);
            mSelectionCallback(selectedIds);
        } else { console.error("Interaction not supported!"); return; }
    }

    function pan(x, y) {
        mZoomTransform = d3.zoomIdentity.translate(0, y).scale(mZoomTransform.k);
        draw();
    }

    function zoom(x, y, scale) {
        mZoomTransform = d3.zoomIdentity.translate(0, y).scale(scale);
        draw();
    }

    function getTranslate() {
        return { x: mZoomTransform.x, y: mZoomTransform.y };
    }

    function getScale() {
        return mZoomTransform.k;
    }


    function getZoomTransform() {
        return {
            x: mZoomTransform.x,
            y: mZoomTransform.y,
            k: mZoomTransform.k,
        }
    }

    return {
        updateSimulationData,
        start,
        stop,
        interactionStart,
        interactionDrag,
        interactionEnd,
        pan,
        zoom,
        onHighlight,
        onSelection,
        getTranslate,
        getScale,
        getZoomTransform,
        setAddDimensionCallback: (func) => mAddDimensionCallback = func,
        setClickDimensionCallback: (func) => mClickDimensionCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
    }
}
function FdlLegendViewController(mDrawingUtil, mCodeUtil) {
    const PADDING = 10;

    const ADD_BUTTON_ID = 'add_button';

    let mAddDimensionCallback = () => { };
    let mClickDimensionCallback = () => { };

    let mZoomTransform = d3.zoomIdentity.translate(0, 300);

    let mHighlight = [];

    let mDimensions = [];
    let mLevels = [];
    let mAddButton = { id: ADD_BUTTON_ID, x: 0, y: 0 };

    let mLinks = [];

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

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        mDimensions.forEach(dimension => {
            let dimensionString = dimension.name +
                " [" + DimensionLabels[dimension.type] + "][" +
                ChannelLabels[dimension.channel] + "][T" + dimension.tier + "]";
            mDrawingUtil.drawStringNode(
                dimension.x,
                dimension.y,
                dimensionString,
                Size.DIMENSION_SIZE,
                mHighlight.includes(dimension.id),
                mCodeUtil.getCode(dimension.id))
        })

        mLevels.forEach(level => {
            mDrawingUtil.drawStringNode(
                level.x,
                level.y,
                level.name,
                Size.LEVEL_SIZE,
                mHighlight.includes(level.id),
                mCodeUtil.getCode(level.id))
        })

        mDrawingUtil.drawStringNode(
            AxisPositions.DIMENSION_X,
            mAddButton.y,
            "Add Dimension +",
            Size.DIMENSION_SIZE,
            mHighlight.includes(ADD_BUTTON_ID),
            mCodeUtil.getCode(ADD_BUTTON_ID));

    }

    function stop() {
        mSimulation.stop();
    }

    function interactionStart(interaction, modelCoords) {
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
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetTiles = mDimensions.concat(mLevels).filter(n => target.includes(n.id));
        let dist = MathUtil.subtract(modelCoords, interaction.start);
        targetTiles.forEach(tile => {
            tile.y = tile.startY + dist.y;
        });
    }

    function interactionEnd(interaction, modelCoords) {
        if (MathUtil.dist(interaction.start, modelCoords) < 5) {
            // Handle Click
            if (interaction.target == ADD_BUTTON_ID) {
                mAddDimensionCallback();
            } else if (IdUtil.isType(interaction.target, Data.Dimension)) {
                mClickDimensionCallback(interaction.target)
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
        setAddDimensionCallback: (func) => mAddDimensionCallback = func,
        setClickDimensionCallback: (func) => mClickDimensionCallback = func,
    }
}
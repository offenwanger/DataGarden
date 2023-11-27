function FdlLegendViewController(mDrawingUtil, mCodeUtil) {
    const PADDING = 10;

    const ADD_BUTTON_ID = 'add_button';

    let mAddDimentionCallback = () => { };
    let mClickDimentionCallback = () => { };

    let mZoomTransform = d3.zoomIdentity.translate(0, 300);

    let mHighlight = [];

    let mDimentions = [];
    let mLevels = [];
    let mAddButton = { id: ADD_BUTTON_ID, x: 0, y: 0 };

    let mLinks = [];

    let mSimulation = d3.forceSimulation()
        .alphaDecay(Decay.ALPHA)
        .velocityDecay(Decay.VELOCITY)
        .alpha(0.3)
        .on("tick", () => {
            mSimulation.nodes().forEach(n => {
                n.x = IdUtil.isType(n.id, Data.Dimention) ? AxisPositions.DIMENTION_X : AxisPositions.LEVEL_X;
                n.y += (mYPositions[n.id] - n.y) * mSimulation.alpha();
            });
            draw();
        })
        .stop();

    function updateSimulationData(data, model) {
        mDimentions = data.filter(d => IdUtil.isType(d.id, Data.Dimention));
        mLevels = data.filter(d => IdUtil.isType(d.id, Data.Level));
        mSimulation.nodes(mDimentions.concat(mLevels).concat([mAddButton]), (d) => d.id);

        mYPositions = [];
        let curYPos = 0;
        let dimentions = model.getDimentions();
        dimentions.forEach(dimention => {
            mYPositions[dimention.id] = curYPos;
            curYPos += Size.DIMENTION_SIZE + PADDING;
            dimention.levels.forEach(level => {
                mYPositions[level.id] = curYPos;
                curYPos += Size.LEVEL_SIZE + PADDING;
            });
        });

        mYPositions[ADD_BUTTON_ID] = curYPos;

        mSimulation.alphaTarget(0.3).restart();
    }

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        mDimentions.forEach(dimention => {
            let dimentionString = dimention.name +
                " [" + DimentionLabels[dimention.type] + "][" +
                ChannelLabels[dimention.channel] + "][T" + dimention.tier + "]";
            mDrawingUtil.drawStringNode(
                dimention.x,
                dimention.y,
                dimentionString,
                Size.DIMENTION_SIZE,
                mHighlight.includes(dimention.id),
                mCodeUtil.getCode(dimention.id))
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
            AxisPositions.DIMENTION_X,
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
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetTiles = mDimentions.concat(mLevels).filter(n => target.includes(n.id));
        let remainingTiles = mDimentions.concat(mLevels).filter(n => !target.includes(n.id));
        targetTiles.forEach(tile => {
            tile.startY = tile.y;
            tile.interacting = true;
        });

        mSimulation.nodes(remainingTiles);

    }

    function interactionDrag(interaction, modelCoords) {
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetTiles = mDimentions.concat(mLevels).filter(n => target.includes(n.id));
        let dist = MathUtil.subtract(modelCoords, interaction.start);
        targetTiles.forEach(tile => {
            tile.y = tile.startY + dist.y;
        });
    }

    function interactionEnd(interaction, modelCoords) {
        if (MathUtil.dist(interaction.start, modelCoords) < 5) {
            // Handle Click
            if (interaction.target == ADD_BUTTON_ID) {
                mAddDimentionCallback();
            } else if (IdUtil.isType(interaction.target, Data.Dimention)) {
                mClickDimentionCallback(interaction.target)
            }
        } else {
            let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
                .map(target => target.id ? target.id : target);
            let targetTiles = mDimentions.concat(mLevels).filter(n => target.includes(n.id));
            targetTiles.forEach(tile => {
                tile.startY = null;
                tile.interacting = null;
            });

            mSimulation.nodes(mDimentions.concat(mLevels).concat([mAddButton]));
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
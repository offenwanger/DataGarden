function FdlDimentionViewController(mDrawingUtil, mCodeUtil) {
    const ADD_BUTTON_ID = 'add_button';
    const TARGET_ELEMENT = "element_target"
    const TARGET_LABEL = "element_label"
    const TARGET_TYPE = "element_type"
    const TARGET_CHANNEL = "element_channel"
    const TARGET_TIER = "element_tier"
    const NODE_COLUMN_WIDTH = 300

    let mAddLevelCallback = () => { };
    let mEditNameCallback = () => { };

    let mModel = new DataModel();
    let mDimentionId = null;

    let mZoomTransform = d3.zoomIdentity.translate(0, 300);

    let mHighlight = [];

    let mDimention = null;
    let mLevels = [];
    let mNodes = [];
    let mAddButton = { id: ADD_BUTTON_ID, x: 0, y: 0 };

    let mDimentionWidth = 0;

    let mLinks = [];

    let mSimulation = d3.forceSimulation()
        .force("x", d3.forceY(0).strength(0.01))
        .force("link", d3.forceLink().id(d => d.id))
        .force("axis", d3.forceX((d => IdUtil.isType(d.id, Data.Element) ? mDimentionWidth + NODE_COLUMN_WIDTH / 2 : 0)).strength(0.7))
        .force("collide", d3.forceCollide((d) => {
            if (IdUtil.isType(d.id, Data.Dimention)) {
                return Size.DIMENTION_SIZE;
            } else if (IdUtil.isType(d.id, Data.Level) || d.id == ADD_BUTTON_ID) {
                return Size.LEVEL_SIZE;
            } else if (IdUtil.isType(d.id, Data.Element)) {
                return d.radius + Padding.NODE * 2;
            } else {
                console.error("Unsupported node!", d.id); return 0;
            }
        }))
        .alpha(0.3)
        .on("tick", () => {
            mSimulation.nodes().forEach(item => {
                if (IdUtil.isType(item.id, Data.Dimention)) {
                    item.x = AxisPositions.DIMENTION_X;
                } else if (IdUtil.isType(item.id, Data.Level)) {
                    item.x = AxisPositions.LEVEL_X;
                }
            });
            draw();
        })
        .alpha(0.3)
        .on("tick", () => { draw(); })
        .stop();

    function updateSimulationData(data, model) {
        mModel = model;

        let dimention = mModel.getDimention(mDimentionId);
        if (!dimention) { console.error("Bad State! Dimention not found!"); return; }
        let levelIds = dimention.levels.map(l => l.id);

        mDimention = data.find(item => item.id == mDimentionId);
        mLevels = data.filter(item => levelIds.includes(item.id));
        // TODO: do this properly, i.e. measure all the stuff in that column
        mDimentionWidth = mDrawingUtil.measureStringNode(mDimention.name +
            " [" + DimentionLabels[mDimention.type] + "][" +
            ChannelLabels[mDimention.channel] + "][T" + mDimention.tier + "]", Size.DIMENTION_SIZE);


        mNodes = data.filter(item => IdUtil.isType(item.id, Data.Element) && DataUtil.getTreeLevel(mModel, item.id) == dimention.tier);

        mLinks = [];
        dimention.levels.forEach(level => {
            level.elements.forEach(element => {
                mLinks.push({ source: element.id, target: level.id });
            })
        })

        mSimulation.force('link').links(mLinks);
        mSimulation.nodes(mLevels.concat(mNodes).concat([mDimention, mAddButton]));

        mSimulation.alphaTarget(0.3).restart();
    }

    function setDimention(dimentionId) {
        mDimentionId = dimentionId;
    }


    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        let dimention = mModel.getDimention(mDimentionId);
        dimention.levels.forEach(level => {
            let clusterNodes = mNodes.filter(n => level.elements.includes(n.id));
            if (clusterNodes.length > 0) {
                let hull = d3.polygonHull(DataUtil.getPaddedPoints(clusterNodes, Padding.NODE)).map(p => { return { x: p[0], y: p[1] } });
                let levelNode = mLevels.find(l => l.id == level.id);
                mDrawingUtil.drawBubble(hull, levelNode, mColorMap(level.id), 0.4);
            }
        })

        drawDimention();

        mLevels.forEach(level => {
            mDrawingUtil.drawStringNode(
                AxisPositions.LEVEL_X,
                level.y,
                level.name,
                Size.LEVEL_SIZE,
                mHighlight.includes(level.id),
                mCodeUtil.getCode(level.id, TARGET_LABEL));
        })

        let elements = mNodes.map(n => mModel.getElement(n.id));
        mNodes.forEach(node => {
            if (IdUtil.isType(node.id, Data.Element)) {
                mDrawingUtil.drawThumbnailCircle(
                    elements.find(e => e.id == node.id).strokes,
                    node.x,
                    node.y,
                    node.radius,
                    node.interacting ? null : mCodeUtil.getCode(node.id, TARGET_ELEMENT));
            } else {
                console.error("Invalid state, this node not supported", node);
            }
        });

        mDrawingUtil.drawStringNode(
            AxisPositions.LEVEL_X,
            mAddButton.y,
            "Add Level +",
            Size.LEVEL_SIZE,
            mHighlight.includes(ADD_BUTTON_ID),
            mCodeUtil.getCode(ADD_BUTTON_ID));
    }

    function drawDimention() {
        let strings = [
            mDimention.name,
            "[" + DimentionLabels[mDimention.type] + "]",
            "[" + ChannelLabels[mDimention.channel] + "]",
            "[T" + mDimention.tier + "]"
        ];
        let widths = [0];
        for (let i = 0; i < strings.length; i++) {
            widths.push(mDrawingUtil.measureStringNode(strings[i], Size.DIMENTION_SIZE) + widths[i] + 3);
        }
        let targets = [TARGET_LABEL, TARGET_TYPE, TARGET_CHANNEL, TARGET_TIER];
        strings.forEach((string, index) => {
            mDrawingUtil.drawStringNode(
                AxisPositions.DIMENTION_X + widths[index],
                mDimention.y,
                string,
                Size.DIMENTION_SIZE,
                mHighlight.includes(mDimention.id),
                mCodeUtil.getCode(mDimention.id, targets[index]));
        })
    }

    function stop() {
        mSimulation.stop();
    }

    function interactionStart(interaction, modelCoords) {

    }

    function interactionDrag(interaction, modelCoords) {

    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.endTarget == interaction.target.id &&
            interaction.target.id == mDimentionId &&
            interaction.target.type == TARGET_LABEL) {
            mEditNameCallback(interaction.target.id, mDimention.x, mDimention.y,
                mDrawingUtil.measureStringNode(mDimention.name, Size.DIMENTION_SIZE), Size.DIMENTION_SIZE);
        } else if (interaction.endTarget == interaction.target.id &&
            interaction.target.id == mDimentionId &&
            interaction.target.type == TARGET_TYPE) {
            console.log("clicked TARGET_TYPE")
        } else if (interaction.endTarget == interaction.target.id &&
            interaction.target.id == mDimentionId &&
            interaction.target.type == TARGET_CHANNEL) {
            console.log("clicked TARGET_CHANNEL")
        } else if (interaction.endTarget == interaction.target.id &&
            interaction.target.id == mDimentionId &&
            interaction.target.type == TARGET_TIER) {
            console.log("clicked TARGET_TIER")
        } else if (interaction.endTarget == interaction.target.id &&
            IdUtil.isType(interaction.target.id, Data.Level) &&
            interaction.target.type == TARGET_LABEL) {
            let levelNode = mLevels.find(l => l.id == interaction.target.id);
            if (!levelNode) { console.error("Invalid level id", interaction.target.id); return; }
            mEditNameCallback(interaction.target.id, levelNode.x, levelNode.y,
                mDrawingUtil.measureStringNode(levelNode.name, Size.LEVEL_SIZE), Size.LEVEL_SIZE);
        } else if (interaction.endTarget == interaction.target &&
            interaction.target == ADD_BUTTON_ID) {
            mAddLevelCallback(mDimentionId);
        }
    }

    function pan(x, y) {
        mZoomTransform = d3.zoomIdentity.translate(x, y).scale(mZoomTransform.k);
        draw();
    }

    function zoom(x, y, scale) {
        mZoomTransform = d3.zoomIdentity.translate(x, y).scale(scale);
        draw();
    }

    function highlight(ids) {

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
        setAddLevelCallback: (func) => mAddLevelCallback = func,
        setEditNameCallback: (func) => mEditNameCallback = func,
    }
}
function FdlDimentionViewController(mDrawingUtil, mCodeUtil) {
    const ADD_BUTTON_ID = 'add_button';
    const TARGET_ELEMENT = "element_target"
    const NODE_COLUMN_WIDTH = 300

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
        mDimentionWidth = mDrawingUtil.measureString(mDimention.name +
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
            let clusterNodes = elements.filter(e => level.elements.includes(e)).map(e => mNodes.find(n => n.id == e.id));
            if (clusterNodes.length > 0) {
                let hull = d3.polygonHull(DataUtil.getPaddedPoints(clusterNodes, Padding.NODE)).map(p => { return { x: p[0], y: p[1] } });
                let levelNode = mLevels.find(l => l.id == level.id);
                mDrawingUtil.drawBubble(hull, levelNode, mColorMap(level.id), 0.4);
            }
        })

        let dimentionString = mDimention.name +
            " [" + DimentionLabels[mDimention.type] + "][" +
            ChannelLabels[mDimention.channel] + "][T" + mDimention.tier + "]";
        mDrawingUtil.drawStringNode(
            AxisPositions.DIMENTION_X,
            mDimention.y,
            dimentionString,
            Size.DIMENTION_SIZE,
            mHighlight.includes(mDimention.id),
            mCodeUtil.getCode(mDimention.id))

        mLevels.forEach(level => {
            mDrawingUtil.drawStringNode(AxisPositions.LEVEL_X, level.y, level.name, Size.LEVEL_SIZE)
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
    }
}
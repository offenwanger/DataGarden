function FdlDimensionViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap) {
    const ADD_BUTTON_ID = 'add_button';
    const MAX_VALUE_ID = 'max_value';
    const MIN_VALUE_ID = 'min_value';
    const TARGET_ELEMENT = "element_target";
    const TARGET_LABEL = "element_label";
    const TARGET_TYPE = "element_type";
    const TARGET_CHANNEL = "element_channel";
    const TARGET_TIER = "element_tier";
    const NODE_COLUMN_WIDTH = 300

    let mAddLevelCallback = () => { };
    let mEditNameCallback = () => { };
    let mEditDomainCallback = () => { };
    let mEditTypeCallback = () => { }
    let mEditChannelCallback = () => { }
    let mEditTierCallback = () => { }
    let mUpdateLevelCallback = () => { };
    let mSelectionCallback = () => { };

    let mModel = new DataModel();
    let mDimensionId = null;

    let mZoomTransform = d3.zoomIdentity.translate(0, 300);

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mDimension = null;
    let mLevels = [];
    let mNodes = [];
    let mAddButton = { id: ADD_BUTTON_ID, x: 0, y: 0 };

    let mDimensionWidth = 0;
    let mDimensionType;
    let mDimensionTileWidths = [];

    let mLinks = [];

    let mSimulation = d3.forceSimulation()
        .alphaDecay(Decay.ALPHA)
        .velocityDecay(Decay.VELOCITY)
        .force("y", d3.forceY(0).strength(0.05))
        .force("link", d3.forceLink().id(d => d.id))
        .force("axis", d3.forceX((d => IdUtil.isType(d.id, Data.Element) ? mDimensionWidth + NODE_COLUMN_WIDTH / 2 : 0)).strength(0.7))
        .force("collide", d3.forceCollide((d) => {
            if (IdUtil.isType(d.id, Data.Dimension)) {
                return Size.DIMENSION_SIZE;
            } else if (IdUtil.isType(d.id, Data.Level) || d.id == ADD_BUTTON_ID || d.id == DimensionValueId.V1 || d.id == DimensionValueId.V2) {
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
                if (item.id == mDimensionId) {
                    let yTarget = Math.min(0, ...mNodes.map(n => n.y), ...mLevels.map(n => n.y)) - Size.DIMENSION_SIZE - Size.ELEMENT_NODE_SIZE;
                    item.y = item.y += (yTarget - item.y) * mSimulation.alpha();
                    item.x = AxisPositions.DIMENSION_X;
                } else if (IdUtil.isType(item.id, Data.Level)) {
                    item.x = AxisPositions.LEVEL_X;
                } else if (item.id == ADD_BUTTON_ID) {
                    let yTarget = Math.max(Size.DIMENSION_SIZE, ...mNodes.map(n => n.y), ...mLevels.map(n => n.y)) + Size.LEVEL_SIZE + Size.ELEMENT_NODE_SIZE;
                    item.y = item.y += (yTarget - item.y) * mSimulation.alpha();
                    item.x = AxisPositions.LEVEL_X;
                } else if (item.id == DimensionValueId.V1) {
                    let yTarget = Math.min(Size.DIMENSION_SIZE, ...mNodes.map(n => n.y));
                    item.y = item.y += (yTarget - item.y) * mSimulation.alpha();
                    item.x = AxisPositions.LEVEL_X;
                } else if (item.id == DimensionValueId.V2) {
                    let yTarget = Math.max(Size.DIMENSION_SIZE * 2, ...mNodes.map(n => n.y));
                    item.y = item.y += (yTarget - item.y) * mSimulation.alpha();
                    item.x = AxisPositions.LEVEL_X;
                }
            });
            draw();
        })
        .stop();

    function updateSimulationData(data, model) {
        mModel = model;

        let dimension = mModel.getDimension(mDimensionId);
        if (!dimension) { console.error("Bad State! Dimension not found!"); return; }

        mDimension = data.find(item => item.id == mDimensionId);
        // TODO: do this properly, i.e. measure all the stuff in that column
        mDimensionWidth = mDrawingUtil.measureStringNode(mDimension.name +
            " [" + DimensionLabels[mDimension.type] + "][" +
            ChannelLabels[mDimension.channel] + "][T" + mDimension.tier + "]", Size.DIMENSION_SIZE);
        mDimensionType = dimension.type;

        mLevels = data.filter(item => item.dimension == mDimensionId);

        mNodes = data.filter(item => IdUtil.isType(item.id, Data.Element) && DataUtil.getTreeLevel(mModel, item.id) == dimension.tier);

        mLinks = [];
        dimension.levels.forEach(level => {
            level.elementIds.forEach(elementId => {
                mLinks.push({ source: elementId, target: level.id });
            })
        })

        mSimulation.nodes(mLevels.concat(mNodes).concat([mDimension, mAddButton]));
        mSimulation.force('link').links(mLinks);

        mSimulation.alphaTarget(0.3).restart();
    }

    function onHighlight(highlightedIds) {
        if (!highlightedIds || !Array.isArray(highlightedIds)) { mHighlightIds = []; return; }
        mHighlightIds = DataUtil.unique(highlightedIds.map(id => {
            if (IdUtil.isType(id, Data.Stroke)) {
                let element = mModel.getElementForStroke(id);
                if (!element) { console.error("Bad state, element not found for stroke"); return id; }
                return element.id;
            } else {
                return id;
            }
        }));
    }

    function onSelection(selectedIds) {
        if (!selectedIds || !Array.isArray(selectedIds)) { mSelectionIds = []; return; }
        mSelectionIds = DataUtil.unique(selectedIds.map(id => {
            if (IdUtil.isType(id, Data.Stroke)) {
                let element = mModel.getElementForStroke(id);
                if (!element) { console.error("Bad state, element not found for stroke"); return id; }
                return element.id;
            } else {
                return id;
            }
        }));
    }

    function setDimension(dimensionId) {
        mDimensionId = dimensionId;
    }


    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        let dimension = mModel.getDimension(mDimensionId);
        dimension.levels.forEach(level => {
            let clusterNodes = mNodes.filter(n => level.elementIds.includes(n.id));
            if (clusterNodes.length > 0) {
                let hull = d3.polygonHull(DataUtil.getPaddedPoints(clusterNodes, Padding.NODE)).map(p => { return { x: p[0], y: p[1] } });
                let levelNode = mLevels.find(l => l.id == level.id);
                mDrawingUtil.drawBubble(hull, levelNode, mColorMap(level.id), 0.4);
            }
        })

        drawDimension();

        mLevels.forEach(level => {
            mDrawingUtil.drawStringNode({
                x: AxisPositions.LEVEL_X,
                y: level.y,
                label: level.name,
                height: Size.LEVEL_SIZE,
                shadow: mHighlightIds.includes(level.id),
                code: mCodeUtil.getCode(level.id, TARGET_LABEL),
                outline: mSelectionIds.includes(level.id) ? mColorMap(level.id) : null,
                background: level.invalid ? "#FF6865" : "white"
            });
        })

        let elements = mNodes.map(n => mModel.getElement(n.id));
        mNodes.forEach(node => {
            if (IdUtil.isType(node.id, Data.Element)) {
                mDrawingUtil.drawThumbnailCircle({
                    strokes: elements.find(e => e.id == node.id).strokes,
                    cx: node.x,
                    cy: node.y,
                    r: node.radius,
                    shadow: mHighlightIds.includes(node.id),
                    outline: mSelectionIds.includes(node.id) ? mColorMap(node.id) : null,
                    code: node.interacting ? null : mCodeUtil.getCode(node.id, TARGET_ELEMENT)
                });
            } else {
                console.error("Invalid state, this node not supported", node);
            }
        });

        if (mDimensionType == DimensionType.DISCRETE) {
            mDrawingUtil.drawStringNode({
                x: AxisPositions.LEVEL_X,
                y: mAddButton.y,
                label: "Add Level +",
                height: Size.LEVEL_SIZE,
                outline: mSelectionIds.includes(ADD_BUTTON_ID) ? mColorMap(ADD_BUTTON_ID) : null,
                shadow: mHighlightIds.includes(ADD_BUTTON_ID),
                code: mCodeUtil.getCode(ADD_BUTTON_ID)
            });
        }
    }

    function drawDimension() {
        let strings = [
            mDimension.name,
            "[" + DimensionLabels[mDimension.type] + "]",
            "[" + ChannelLabels[mDimension.channel] + "]",
            "[T" + mDimension.tier + "]"
        ];
        mDimensionTileWidths = [0];
        for (let i = 0; i < strings.length; i++) {
            mDimensionTileWidths.push(mDrawingUtil.measureStringNode(strings[i], Size.DIMENSION_SIZE) + mDimensionTileWidths[i] + 3);
        }
        let targets = [TARGET_LABEL, TARGET_TYPE, TARGET_CHANNEL, TARGET_TIER];
        strings.forEach((string, index) => {
            mDrawingUtil.drawStringNode({
                x: AxisPositions.DIMENSION_X + mDimensionTileWidths[index],
                y: mDimension.y,
                label: string,
                height: Size.DIMENSION_SIZE,
                shadow: mHighlightIds.includes(mDimension.id),
                code: mCodeUtil.getCode(mDimension.id, targets[index])
            });
        })
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
        let targetItems = mNodes.concat(mLevels).concat([mDimension, mAddButton]).filter(n => target.includes(n.id));
        let remainingItems = mNodes.concat(mLevels).concat([mDimension, mAddButton]).filter(n => !target.includes(n.id));
        targetItems.forEach(item => {
            item.startX = item.x;
            item.startY = item.y;
            item.interacting = true;
        });

        mSimulation.nodes(remainingItems);
    }

    function interactionDrag(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetItems = mNodes.concat(mLevels).concat([mDimension, mAddButton]).filter(n => target.includes(n.id));
        let dist = VectorUtil.subtract(modelCoords, interaction.start);
        targetItems.forEach(item => {
            if (IdUtil.isType(item.id, Data.Element)) {
                item.x = item.startX + dist.x;
            }
            item.y = item.startY + dist.y;
        });
    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.type == FdlInteraction.SELECTION) {
            if (VectorUtil.dist(interaction.start, modelCoords) < 5) {
                // Handle Click
                if (interaction.target.id == mDimensionId) {
                    if (interaction.target.type == TARGET_LABEL) {
                        mEditNameCallback(interaction.target.id, mDimension.x, mDimension.y,
                            mDimensionTileWidths[1] - mDimensionTileWidths[0], Size.DIMENSION_SIZE);
                    } else if (interaction.target.type == TARGET_TYPE) {
                        mEditTypeCallback(interaction.target.id, mDimension.x + mDimensionTileWidths[1], mDimension.y,
                            mDimensionTileWidths[2] - mDimensionTileWidths[1], Size.DIMENSION_SIZE);
                    } else if (interaction.target.type == TARGET_CHANNEL) {
                        mEditChannelCallback(interaction.target.id, mDimension.x + mDimensionTileWidths[2], mDimension.y,
                            mDimensionTileWidths[3] - mDimensionTileWidths[2], Size.DIMENSION_SIZE);
                    } else if (interaction.target.type == TARGET_TIER) {
                        mEditTierCallback(interaction.target.id, mDimension.x + mDimensionTileWidths[3], mDimension.y,
                            mDimensionTileWidths[4] - mDimensionTileWidths[3], Size.DIMENSION_SIZE);
                    } else {
                        console.error("Unsupported Target Type", interaction.target.type);
                    }
                } else if (interaction.target.id && IdUtil.isType(interaction.target.id, Data.Level)) {
                    let levelNode = mLevels.find(l => l.id == interaction.target.id);
                    if (!levelNode) { console.error("Invalid level id", interaction.target.id); return; }
                    mEditNameCallback(interaction.target.id, levelNode.x, levelNode.y,
                        mDrawingUtil.measureStringNode(levelNode.name, Size.LEVEL_SIZE), Size.LEVEL_SIZE);
                } else if (interaction.target == ADD_BUTTON_ID) {
                    mAddLevelCallback(mDimensionId);
                } else if (interaction.target.id && (interaction.target.id == DimensionValueId.V2 || interaction.target.id == DimensionValueId.V1)) {
                    let node = mLevels.find(l => l.id == interaction.target.id);
                    mEditDomainCallback(mDimensionId, interaction.target.id, node.x, node.y,
                        mDrawingUtil.measureStringNode(node.name, Size.LEVEL_SIZE), Size.LEVEL_SIZE)
                }
            } else {
                // Handle Drag End
                let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
                    .map(target => target.id ? target.id : target);

                let targetItems = mNodes.concat(mLevels).concat([mDimension, mAddButton]).filter(n => target.includes(n.id));
                targetItems.forEach(item => {
                    item.startX = null;
                    item.startY = null;
                    item.interacting = null;
                });

                let elementTargets = target.filter(id => IdUtil.isType(id, Data.Element));
                if (elementTargets.length > 0) {
                    let levelTarget;
                    if (interaction.endTarget && IdUtil.isType(interaction.endTarget, Data.Level)) {
                        levelTarget = interaction.endTarget;
                    } else if (interaction.endTarget && IdUtil.isType(interaction.endTarget, Data.Element)) {
                        levelTarget = mModel.getLevelForElement(mDimensionId, interaction.endTarget);
                    } else if (modelCoords.y < Math.min(...mLevels.concat([mDimension]).map(n => n.y))) {
                        levelTarget = null;
                    }
                    mUpdateLevelCallback(mDimensionId, levelTarget, elementTargets);
                }
                mSimulation.nodes(mNodes.concat(mLevels).concat([mDimension, mAddButton]));
            }
        } else if (interaction.type == FdlInteraction.LASSO) {
            mOverlayUtil.reset(mZoomTransform);
            mOverlayUtil.drawBubble(interaction.path);
            let selectedIds = mLevels.concat(mNodes).filter(obj => mOverlayUtil.covered(obj)).map(n => n.id);
            mSelectionCallback(selectedIds);
        } else { console.error("Interaction not supported!"); return; }
    }

    function pan(x, y) {
        mZoomTransform = d3.zoomIdentity.translate(x, y).scale(mZoomTransform.k);
        draw();
    }

    function zoom(x, y, scale) {
        mZoomTransform = d3.zoomIdentity.translate(x, y).scale(scale);
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
        setDimension,
        getTranslate,
        getScale,
        getZoomTransform,
        setAddLevelCallback: (func) => mAddLevelCallback = func,
        setEditNameCallback: (func) => mEditNameCallback = func,
        setEditDomainCallback: (func) => mEditDomainCallback = func,
        setEditTypeCallback: (func) => mEditTypeCallback = func,
        setEditChannelCallback: (func) => mEditChannelCallback = func,
        setEditTierCallback: (func) => mEditTierCallback = func,
        setUpdateLevelCallback: (func) => mUpdateLevelCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
    }
}
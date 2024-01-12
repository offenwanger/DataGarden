function FdlDimensionViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap) {
    const ADD_BUTTON_ID = 'add_button';
    const TARGET_ELEMENT = "element_target";
    const TARGET_LABEL = "element_label";
    const TARGET_TYPE = "element_type";
    const TARGET_CHANNEL = "element_channel";
    const TARGET_TIER = "element_tier";
    const TARGET_BUBBLE = "level_bubble";
    const NODE_COLUMN_WIDTH = 300;
    const ADD_LEVEL_LABEL = "Add Category +";
    const BACK_LABEL = "<- Back to all Dimensions";
    const LINK_ID = "link_"

    let mAddLevelCallback = () => { };
    let mEditNameCallback = () => { };
    let mEditDomainCallback = () => { };
    let mEditTypeCallback = () => { }
    let mEditChannelCallback = () => { }
    let mEditTierCallback = () => { }
    let mUpdateLevelCallback = () => { };
    let mLevelOrderUpdateCallback = () => { };

    let mModel = new DataModel();
    let mDimensionId = null;

    let mZoomTransform = d3.zoomIdentity.translate(0, 300);

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mDimension = null;
    let mLevels = [];
    let mNodes = [];
    let mLinkPoints = [];
    let mAddButton = { id: ADD_BUTTON_ID, x: 0, y: 0 };

    let mDimensionWidth = 0;
    let mDimensionType;
    let mDimensionTileWidths = [];

    let mMinSize = 0
    let mMaxSize = 1

    let mMaxLevelWdith = 10;
    let mAxisX = 0;
    let mAxisTop = 0;
    let mAxisBottom = 200;

    let mLinks = [];

    let mTargetLock = null;
    let mDraggedItems = [];

    let mSimulation = d3.forceSimulation()
        .alphaDecay(Decay.ALPHA)
        .velocityDecay(Decay.VELOCITY)
        .force("y", d3.forceY(0).strength(0.05))
        .force("link", d3.forceLink().id(d => d.id))
        .force("axis", d3.forceX((d => IdUtil.isType(d.id, Data.Element) ? mDimensionWidth + NODE_COLUMN_WIDTH / 2 : 0)).strength(0.7))
        .force("collide", d3.forceCollide((d) => IdUtil.isType(d.id, Data.Element) ? d.radius + Padding.NODE * 2 : 0))
        .alpha(0.3)
        .on("tick", () => {
            // do this for eveything included non-sim items
            allItems().forEach(node => {
                if (node && node.targetX) {
                    node.x += (node.targetX - node.x) * mSimulation.alpha();
                }
                if (node && node.targetY) {
                    node.y += (node.targetY - node.y) * mSimulation.alpha();
                }
            });

            let top = mNodes.length == 0 ? 0 : Math.min(...mNodes.map(n => n.y));
            let bottom = Math.max(mLevels.length * Size.LEVEL_SIZE * 2, ...mNodes.map(n => n.y));

            // update dimension and level positions
            // but only if we're not dragging
            if (mDraggedItems.length == 0) {
                mSimulation.nodes().forEach(item => {
                    if (item.id == mDimensionId) {
                        item.targetY = top - Size.DIMENSION_SIZE - Size.ELEMENT_NODE_SIZE;
                    } else if (item.id == ADD_BUTTON_ID) {
                        item.targetY = bottom;
                    } else if (item.id == DimensionValueId.V1 ||
                        item.id == DimensionValueId.V2 ||
                        IdUtil.isType(item.id, Data.Level)) {
                        let index;
                        if (item.id == DimensionValueId.V1) {
                            index = 0;
                        } else if (item.id == DimensionValueId.V2) {
                            index = 1;
                        } else {
                            index = mLevels.findIndex(l => l.id == item.id);
                        }
                        item.targetY = index * (bottom - top) / mLevels.length + top;
                    }
                });
            }

            draw();
        })
        .stop();

    function updateSimulationData(data, model) {
        mModel = model;

        let dimension = mModel.getDimension(mDimensionId);
        if (!dimension) { console.error("Bad State! Dimension not found!"); return; }

        mDimension = data.find(item => item.id == mDimensionId);
        mNodes = data.filter(item => IdUtil.isType(item.id, Data.Element) && DataUtil.getTreeLevel(mModel, item.id) == dimension.tier);
        mLevels = data.filter(item => item.dimension == mDimensionId);

        // TODO: do this properly, i.e. measure all the stuff in that column
        mDimensionWidth = mDrawingUtil.measureStringNode(mDimension.name +
            " [" + DimensionLabels[mDimension.type] + "][" +
            ChannelLabels[mDimension.channel] + "][T" + mDimension.tier + "]", Size.DIMENSION_SIZE);
        mDimensionType = dimension.type;

        mMaxLevelWdith = mLevels.concat({ name: ADD_LEVEL_LABEL }).reduce((max, level) => {
            return Math.max(max, mDrawingUtil.measureStringNode(level.name, Size.LEVEL_SIZE));
        }, 10)
        mAxisX = mMaxLevelWdith + AxisPositions.LEVEL_X + Padding.NODE


        mLinkPoints = [];
        mLinks = [];
        if (dimension.channel == ChannelType.SIZE) {
            mNodes.forEach(n => {
                let element = mModel.getElement(n.id);
                let size = PathUtil.getPathLength(element.spine);
                mLinkPoints.push({ id: LINK_ID + n.id, size });
                mLinks.push({ source: n.id, target: LINK_ID + n.id });
            });
            mMinSize = Math.round(Math.min(Infinity, ...mLinkPoints.map(p => p.size)));
            mMinSize = mMinSize == Infinity ? 0 : mMinSize;
            mMaxSize = Math.round(1 + Math.max(0, ...mLinkPoints.map(p => p.size)));
            mLinkPoints.forEach(p => {
                let percent = (p.size - mMinSize) / (mMaxSize - mMinSize);
                let point = PathUtil.getPercentBetweenPoints(
                    { x: mAxisX, y: mAxisTop },
                    { x: mAxisX, y: mAxisBottom },
                    percent
                )
                p.x = point.x;
                p.y = point.y;
            });
        } else if (dimension.channel == ChannelType.POSITION) {
            mNodes.forEach(n => {
                let element = mModel.getElement(n.id);
                let point = PathUtil.getPercentBetweenPoints(
                    { x: mAxisX, y: mAxisTop },
                    { x: mAxisX, y: mAxisBottom },
                    element.position,
                )
                mLinkPoints.push({ id: LINK_ID + n.id, x: point.x, y: point.y });
                mLinks.push({ source: n.id, target: LINK_ID + n.id });
            });
        } else if (dimension.channel == ChannelType.ANGLE) {
            mNodes.forEach(n => {
                let linkPoint = { id: LINK_ID + n.id };
                let element = mModel.getElement(n.id);
                let angle = DataUtil.getRelativeAngle(element, element.parentId ? mModel.getElement(element.parentId) : null)
                let percent = DataUtil.angleToPercent(angle);

                linkPoint.angle = angle;
                let point = PathUtil.getPercentBetweenPoints(
                    { x: mAxisX, y: mAxisTop },
                    { x: mAxisX, y: mAxisBottom },
                    percent,
                )
                linkPoint.x = point.x;
                linkPoint.y = point.y;
                mLinkPoints.push(linkPoint);
                mLinks.push({ source: n.id, target: LINK_ID + n.id });
            });
        }
        mLinkPoints.forEach(p => { p.fx = p.x; p.fy = p.y });

        if (dimension.type == DimensionType.DISCRETE && (dimension.channel == ChannelType.FORM || dimension.channel == ChannelType.COLOR)) {
            dimension.levels.forEach(level => {
                level.elementIds.forEach(elementId => {
                    mLinks.push({ source: elementId, target: level.id });
                })
            })
        } else {

        }
        mSimulation.nodes(mLevels.concat(mNodes).concat(mLinkPoints).concat([mDimension, mAddButton]));
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
        mSelectionIds = selectedIds;
    }

    function setDimension(dimensionId) {
        mDimensionId = dimensionId;
    }


    function draw() {
        let draggedIds = mDraggedItems.map(n => n.id);

        mDrawingUtil.reset(mZoomTransform);
        // we haven't been set yet, don't draw.
        if (!mDimensionId) return;

        let dimension = mModel.getDimension(mDimensionId);
        if (dimension.channel == ChannelType.FORM || dimension.channel == ChannelType.COLOR) {
            dimension.levels.forEach(level => {
                let clusterNodes = mNodes
                    .filter(n => level.elementIds.includes(n.id))
                    .filter(n => !draggedIds.includes(n.id))
                if (clusterNodes.length > 0) {
                    let hull = d3.polygonHull(DataUtil.getPaddedPoints(clusterNodes, Padding.NODE)).map(p => { return { x: p[0], y: p[1] } });
                    let levelNode = mLevels.find(l => l.id == level.id);
                    mDrawingUtil.drawBubble({
                        outline: hull,
                        pointer: levelNode,
                        color: mColorMap(level.id),
                        alpha: 0.4,
                        shadow: mHighlightIds.includes(level.id),
                        code: mCodeUtil.getCode(level.id, TARGET_BUBBLE)
                    });
                }
            })
        } else {
            let startLabel, endLabel;
            if (dimension.channel == ChannelType.SIZE) {
                startLabel = mMinSize;
                endLabel = mMaxSize;
            } else if (dimension.channel == ChannelType.POSITION) {
                startLabel = "0%";
                endLabel = "100%";
            } else if (dimension.channel == ChannelType.ANGLE) {
                startLabel = "-180°";
                endLabel = "180°";
            } else {
                console.error("Dimension channel not supported", dimension.channel);
            }

            mDrawingUtil.drawAxis({
                start: { x: mAxisX, y: mAxisTop },
                end: { x: mAxisX, y: mAxisBottom },
                startLabel, endLabel
            });

            mLinks.forEach(link => {
                mDrawingUtil.drawLinkLine({
                    start: link.source,
                    end: link.target
                });
            })
        }

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
        mNodes.filter(n => !draggedIds.includes(n.id)).forEach(node => drawNode(node, elements.find(e => e.id == node.id)));
        mNodes.filter(n => draggedIds.includes(n.id)).forEach(node => drawNode(node, elements.find(e => e.id == node.id)))

        if (mDimensionType == DimensionType.DISCRETE) {
            mDrawingUtil.drawStringNode({
                x: AxisPositions.LEVEL_X,
                y: mAddButton.y,
                label: ADD_LEVEL_LABEL,
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
        let valid = [
            true,
            DataUtil.dimensionTypeValid(mDimension),
            DataUtil.dimensionChannelValid(mDimension),
            DataUtil.dimensionTierValid(mDimension)
        ]
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
                code: mCodeUtil.getCode(mDimension.id, targets[index]),
                background: valid[index] ? "white" : "#FF6865",
            });
        })
    }

    function drawNode(node, element) {
        if (IdUtil.isType(node.id, Data.Element)) {
            mDrawingUtil.drawThumbnailCircle({
                strokes: element.strokes,
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
    }

    function start() {
        mSimulation.alphaTarget(0.3).restart();
    }

    function stop() {
        mSimulation.stop();
    }

    function interactionStart(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        mDraggedItems = allItems().filter(n => interaction.target.includes(n.id));
        mDraggedItems.forEach(item => {
            item.startX = item.x;
            item.startY = item.y;
            item.interacting = true;
        });

        mSimulation.nodes(allItems().filter(n => !interaction.target.includes(n.id)));
    }

    function interactionDrag(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }

        if (interaction.mouseOverTarget) {
            if (interaction.mouseOverTarget.id == mTargetLock) {
                // do nothing
            } else if (IdUtil.isType(interaction.mouseOverTarget.id, Data.Level)) {
                mTargetLock = interaction.mouseOverTarget.id;
                let targetLevel = mLevels.find(n => n.id == mTargetLock);
                mDraggedItems.forEach(item => {
                    if (IdUtil.isType(item.id, Data.Element)) {
                        item.targetX = (targetLevel.x + mDimensionWidth) / 2;
                        item.targetY = targetLevel.y + Size.LEVEL_SIZE / 2;
                    }
                });
            }
        } else {
            mTargetLock = null;
        }

        let dist = VectorUtil.subtract(modelCoords, interaction.start);
        if (!mTargetLock) {
            mDraggedItems.forEach(item => {
                if (IdUtil.isType(item.id, Data.Element)) {
                    item.targetX = item.startX + dist.x;
                }
                item.targetY = item.startY + dist.y;
            });
        }
    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.type == FdlInteraction.SELECTION) {
            if (VectorUtil.dist(interaction.start, modelCoords) < 5 && interaction.startTarget) {
                // Handle Click
                if (interaction.startTarget && interaction.startTarget.id == mDimensionId) {
                    if (interaction.startTarget.type == TARGET_LABEL) {
                        mEditNameCallback(interaction.startTarget.id, mDimension.x, mDimension.y,
                            mDimensionTileWidths[1] - mDimensionTileWidths[0], Size.DIMENSION_SIZE);
                    } else if (interaction.startTarget.type == TARGET_TYPE) {
                        mEditTypeCallback(interaction.startTarget.id, mDimension.x + mDimensionTileWidths[1], mDimension.y,
                            mDimensionTileWidths[2] - mDimensionTileWidths[1], Size.DIMENSION_SIZE);
                    } else if (interaction.startTarget.type == TARGET_CHANNEL) {
                        mEditChannelCallback(interaction.startTarget.id, mDimension.x + mDimensionTileWidths[2], mDimension.y,
                            mDimensionTileWidths[3] - mDimensionTileWidths[2], Size.DIMENSION_SIZE);
                    } else if (interaction.startTarget.type == TARGET_TIER) {
                        mEditTierCallback(interaction.startTarget.id, mDimension.x + mDimensionTileWidths[3], mDimension.y,
                            mDimensionTileWidths[4] - mDimensionTileWidths[3], Size.DIMENSION_SIZE);
                    } else {
                        console.error("Unsupported Target Type", interaction.startTarget.type);
                    }
                } else if (interaction.startTarget && IdUtil.isType(interaction.startTarget.id, Data.Level)) {
                    let levelNode = mLevels.find(l => l.id == interaction.startTarget.id);
                    if (!levelNode) { console.error("Invalid level id", interaction.startTarget.id); return; }
                    mEditNameCallback(interaction.startTarget.id, levelNode.x, levelNode.y,
                        mDrawingUtil.measureStringNode(levelNode.name, Size.LEVEL_SIZE), Size.LEVEL_SIZE);
                } else if (interaction.startTarget && interaction.endTarget && interaction.endTarget.id == ADD_BUTTON_ID) {
                    mAddLevelCallback(mDimensionId);
                } else if (interaction.startTarget && (interaction.startTarget.id == DimensionValueId.V2 || interaction.startTarget.id == DimensionValueId.V1)) {
                    let node = mLevels.find(l => l.id == interaction.startTarget.id);
                    mEditDomainCallback(mDimensionId, interaction.startTarget.id, node.x, node.y,
                        mDrawingUtil.measureStringNode(node.name, Size.LEVEL_SIZE), Size.LEVEL_SIZE)
                }
            } else {
                mDraggedItems.forEach(item => {
                    item.startX = null;
                    item.startY = null;
                    item.targetX = null;
                    item.targetY = null;
                    item.interacting = null;
                });

                let elementTargetIds = mDraggedItems.map(i => i.id).filter(id => IdUtil.isType(id, Data.Element));
                if (elementTargetIds.length > 0) {
                    let levelTarget;
                    if (interaction.endTarget && IdUtil.isType(interaction.endTarget.id, Data.Level)) {
                        levelTarget = interaction.endTarget.id;
                    } else if (interaction.endTarget && IdUtil.isType(interaction.endTarget.id, Data.Element)) {
                        levelTarget = mModel.getLevelForElement(mDimensionId, interaction.endTarget.id);
                    } else if (modelCoords.y < Math.min(...mLevels.concat([mDimension]).map(n => n.y))) {
                        levelTarget = null;
                    }
                    mUpdateLevelCallback(mDimensionId, levelTarget, elementTargetIds);
                }

                let levelTargetIds = mDraggedItems.map(i => i.id).filter(id => IdUtil.isType(id, Data.Level));
                if (levelTargetIds.length > 0) {
                    let dimension = mModel.getDimension(mDimensionId);
                    let levelsOrdering = dimension.levels.map(l => {
                        let levelItem = mLevels.find(i => i.id == l.id);
                        if (!levelItem) { console.error("Item not found for level id", l.id); return { id: l.id, y: 0 } }
                        return { id: l.id, y: levelItem.y };
                    })
                    levelsOrdering.sort((a, b) => a.y - b.y);
                    mLevelOrderUpdateCallback(mDimensionId, levelsOrdering.map(lo => lo.id));
                }

                mSimulation.nodes(allItems());
            }
        } else if (interaction.type == FdlInteraction.LASSO) {
            mOverlayUtil.reset(mZoomTransform);
            mOverlayUtil.drawBubble(interaction.path);
            let selectedIds = mLevels.concat(mNodes).filter(obj => mOverlayUtil.covered(obj)).map(n => n.id);
            return selectedIds;
        } else { console.error("Interaction not supported!"); return; }

        mDraggedItems = [];
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

    function allItems() {
        return mNodes.concat(mLevels).concat([mDimension, mAddButton]);
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
        setLevelOrderUpdateCallback: (func) => mLevelOrderUpdateCallback = func,
    }
}
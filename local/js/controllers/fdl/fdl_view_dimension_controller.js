import { AxisPositions, ChannelLabels, ChannelType, Decay, DimensionLabels, DimensionType, DimensionValueId, FdlInteraction, Padding, Size } from "../../constants.js";
import { DataModel } from "../../data_model.js";
import { Data } from "../../data_structs.js";
import { DataUtil } from "../../utils/data_util.js";
import { IdUtil } from "../../utils/id_util.js";
import { PathUtil } from "../../utils/path_util.js";
import { VectorUtil } from "../../utils/vector_util.js";

export function FdlDimensionViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap) {
    const ADD_BUTTON_ID = 'add_button';
    const TARGET_ELEMENT = "element_target";
    const TARGET_LABEL = "element_label";
    const TARGET_TYPE = "element_type";
    const TARGET_CHANNEL = "element_channel";
    const TARGET_TIER = "element_tier";
    const TARGET_BUBBLE = "level_bubble";
    const TARGET_AXIS_CONTROL = "axis_control";
    const NODE_COLUMN_WIDTH = 300;
    const ADD_LEVEL_LABEL = "Add Category +";
    const LINK_ID = "link_"
    const CONTROL_ID = 'control_'

    let mAddLevelCallback = () => { };
    let mEditNameCallback = () => { };
    let mEditDomainCallback = () => { };
    let mEditTypeCallback = () => { }
    let mEditChannelCallback = () => { }
    let mEditTierCallback = () => { }
    let mUpdateLevelCallback = () => { };
    let mLevelOrderUpdateCallback = () => { };
    let mUpdateRangeControlCallback = () => { };

    let mModel = new DataModel();
    let mDimensionId = null;

    let mZoomTransform = d3.zoomIdentity.translate(0, 300);

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mDimension = null;
    let mLevels = [];
    let mNodes = [];
    let mContAxisLinkPoints = [];
    let mContAxisControlNodes = [];
    let mAddButton = { id: ADD_BUTTON_ID, x: 0, y: 0 };

    let mDimensionWidth = 0;
    let mDimensionType;
    let mDimensionTileWidths = [];

    let mMinSize = 0
    let mMaxSize = 1

    let mMaxLevelWdith = 10;
    const mAxisTop = Size.LEVEL_SIZE * 2;
    let mAxisBottom = Size.LEVEL_SIZE * 4;
    let mAxisX = 0;

    let mLinks = [];

    let mTargetLock = null;
    let mDraggedNodes = [];

    let mSimulation = d3.forceSimulation()
        .alphaDecay(Decay.ALPHA)
        .velocityDecay(Decay.VELOCITY)
        .force("y", d3.forceY(0).strength(0.05))
        .force("link", d3.forceLink().id(d => d.id))
        .force("axis", d3.forceX((d => IdUtil.isType(d.id, Data.Element) ? mDimensionWidth + NODE_COLUMN_WIDTH / 2 : 0)).strength(0.7))
        .force("collide", d3.forceCollide((d) => IdUtil.isType(d.id, Data.Element) ? d.radius + Padding.NODE * 2 : 0))
        .alpha(0.3)
        .on("tick", () => {
            let top = mNodes.length == 0 ? 0 : Math.min(...mNodes.map(n => n.y));
            let bottom = Math.max(mLevels.length * Size.LEVEL_SIZE * 2, ...mNodes.map(n => n.y));
            let height = bottom - top;
            mAxisBottom = Math.max(height, Size.LEVEL_SIZE * 2);

            mSimulation.force("y", d3.forceY(height / 2).strength(0.05))

            // update dimension and level positions
            // but only if we're not dragging
            if (mDraggedNodes.length == 0) {
                allItems().forEach(node => {
                    if (node.id == mDimensionId) {
                        node.targetY = 0;
                    } else if (node.id == ADD_BUTTON_ID) {
                        node.targetY = height + Size.LEVEL_SIZE * 2;
                    } else if (node.id == DimensionValueId.V1) {
                        node.targetY = Size.LEVEL_SIZE * 2;
                    } else if (node.id == DimensionValueId.V2) {
                        node.targetY = height;
                    } else if (IdUtil.isType(node.id, Data.Level)) {
                        let index = mLevels.findIndex(l => l.id == node.id);
                        node.targetY = (index + 1) * height / mLevels.length;
                    } else if (("" + node.id).startsWith(LINK_ID)) {
                        let pos = PathUtil.getPercentBetweenPoints(
                            { x: mAxisX, y: mAxisTop },
                            { x: mAxisX, y: mAxisBottom },
                            node.percent
                        );
                        node.fx = pos.x;
                        node.fy = pos.y;
                    } else if (("" + node.id).startsWith(CONTROL_ID)) {
                        let pos = PathUtil.getPercentBetweenPoints(
                            { x: mAxisX, y: mAxisTop },
                            { x: mAxisX, y: mAxisBottom },
                            node.percent
                        );
                        node.x = pos.x;
                        node.y = pos.y;
                    }
                });
            }

            // do this for eveything included non-sim nodes
            allItems().forEach(node => {
                if (!node.x) node.x = 0;
                if (!node.y) node.y = 0;

                if (node && node.targetX) {
                    node.x += (node.targetX - node.x) * mSimulation.alpha();
                }
                if (node && node.targetY) {
                    node.y += (node.targetY - node.y) * mSimulation.alpha();
                }

                // not all nodes get set by the simulation so just cover those.
                if (node.fx) node.x = node.fx;
                if (node.fy) node.y = node.fy;
            });

            draw();
        })
        .stop();

    function updateSimulationData(data, model) {
        mModel = model;

        let dimension = mModel.getDimension(mDimensionId);
        if (!dimension) { console.error("Bad State! Dimension not found!"); return; }

        mDimension = data.find(node => node.id == mDimensionId);
        mNodes = data.filter(node => IdUtil.isType(node.id, Data.Element) && DataUtil.getTreeLevel(mModel, node.id) == dimension.tier);
        mLevels = data.filter(node => node.dimension == mDimensionId);

        // TODO: do this properly, i.e. measure all the stuff in that column
        mDimensionWidth = mDrawingUtil.measureStringNode(mDimension.name +
            " [" + DimensionLabels[mDimension.type] + "][" +
            ChannelLabels[mDimension.channel] + "][T" + mDimension.tier + "]", Size.DIMENSION_SIZE);
        mDimensionType = dimension.type;

        mMaxLevelWdith = mLevels.concat({ name: ADD_LEVEL_LABEL }).reduce((max, level) => {
            return Math.max(max, mDrawingUtil.measureStringNode(level.name, Size.LEVEL_SIZE));
        }, 10)
        mAxisX = mMaxLevelWdith + AxisPositions.LEVEL_X + Padding.NODE


        mContAxisLinkPoints = [];
        mContAxisControlNodes = [];
        mLinks = [];
        if (dimension.channel == ChannelType.SIZE) {
            mNodes.forEach(n => {
                let element = mModel.getElement(n.id);
                let size = PathUtil.getPathLength(element.spine);
                mContAxisLinkPoints.push({ id: LINK_ID + n.id, size });
                mLinks.push({ source: n.id, target: LINK_ID + n.id });
            });

            if (mNodes.length > 0) {
                let minSize = Math.round(Math.min(...mContAxisLinkPoints.map(p => p.size)))
                let maxSize = Math.round(1 + Math.max(...mContAxisLinkPoints.map(p => p.size)));
                let range = maxSize - minSize;
                mContAxisLinkPoints.forEach(p => {
                    p.percent = (p.size - minSize) / range
                })
            }
        } else if (dimension.channel == ChannelType.POSITION && dimension.tier > 0) {
            mNodes.forEach(n => {
                let element = mModel.getElement(n.id);
                mContAxisLinkPoints.push({ id: LINK_ID + n.id, percent: element.position });
                mLinks.push({ source: n.id, target: LINK_ID + n.id });
            });
        } else if (dimension.channel == ChannelType.ANGLE) {
            mNodes.forEach(n => {
                let element = mModel.getElement(n.id);
                let angle = DataUtil.getRelativeAngle(element, element.parentId ? mModel.getElement(element.parentId) : null)
                let percent = DataUtil.angleToPercent(angle);
                mContAxisLinkPoints.push({ id: LINK_ID + n.id, percent });
                mLinks.push({ source: n.id, target: LINK_ID + n.id });
            });
        }

        if (dimension.type == DimensionType.DISCRETE && (dimension.channel == ChannelType.FORM || dimension.channel == ChannelType.COLOR)) {
            dimension.levels.forEach(level => {
                level.elementIds.forEach(elementId => {
                    mLinks.push({ source: elementId, target: level.id });
                })
            })
        } else if (dimension.type == DimensionType.DISCRETE &&
            (dimension.channel == ChannelType.SIZE || dimension.channel == ChannelType.POSITION || dimension.channel == ChannelType.ANGLE)) {
            dimension.ranges.forEach((range, index) => {
                mContAxisControlNodes.push({ id: CONTROL_ID + index, index, percent: range });
            });
        }

        mSimulation.nodes(simulationNodes());
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
        let draggedIds = mDraggedNodes.map(n => n.id);

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

            mContAxisControlNodes.forEach(node => {
                mDrawingUtil.drawColorCircle({
                    x: node.x,
                    y: node.y,
                    r: 5,
                    color: 'blue',
                    filled: false,
                    code: mCodeUtil.getCode(node.id, TARGET_AXIS_CONTROL),
                })

                mDrawingUtil.drawLinkLine({ start: node, end: mLevels[node.index], dashed: false });
                mDrawingUtil.drawLinkLine({ start: node, end: mLevels[node.index + 1], dashed: false });
            })

            if (mLevels.length > 0) {
                mDrawingUtil.drawLinkLine({ start: { x: mAxisX, y: mAxisTop }, end: mLevels[0], dashed: false });
                mDrawingUtil.drawLinkLine({ start: { x: mAxisX, y: mAxisBottom }, end: mLevels[mLevels.length - 1], dashed: false });
            }
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
        if (interaction.startTarget && interaction.startTarget.type == TARGET_AXIS_CONTROL) {
            mDraggedNodes = [interaction.startTarget];
            mContAxisControlNodes.forEach(node => node.startY = node.y);
        } else {
            mDraggedNodes = allItems().filter(n => interaction.target.includes(n.id));
            mDraggedNodes.forEach(node => {
                node.startX = node.x;
                node.startY = node.y;
                node.interacting = true;
            });
        }

        mSimulation.nodes(simulationNodes().filter(n => !interaction.target.includes(n.id)));
    }

    function interactionDrag(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }

        if (interaction.startTarget && interaction.startTarget.type == TARGET_AXIS_CONTROL) {
            let targetIndex = mContAxisControlNodes.findIndex(node => node.id == interaction.startTarget.id);
            mContAxisControlNodes[targetIndex].targetY = Math.min(Math.max(modelCoords.y, mAxisTop), mAxisBottom);
            mContAxisControlNodes.forEach((node, index) => {
                if (index < targetIndex) {
                    if (node.startY > mContAxisControlNodes[targetIndex].targetY) {
                        node.targetY = mContAxisControlNodes[targetIndex].targetY;
                    } else {
                        node.targetY = node.startY
                    }
                } else if (index > targetIndex) {
                    if (node.startY < mContAxisControlNodes[targetIndex].targetY) {
                        node.targetY = mContAxisControlNodes[targetIndex].targetY;
                    } else {
                        node.targetY = node.startY
                    }
                }
            })
        } else if (interaction.mouseOverTarget) {
            if (interaction.mouseOverTarget.id == mTargetLock) {
                // do nothing
            } else if (IdUtil.isType(interaction.mouseOverTarget.id, Data.Level)) {
                mTargetLock = interaction.mouseOverTarget.id;
                let targetLevel = mLevels.find(n => n.id == mTargetLock);
                mDraggedNodes.forEach(node => {
                    if (IdUtil.isType(node.id, Data.Element)) {
                        node.targetX = (targetLevel.x + mDimensionWidth) / 2;
                        node.targetY = targetLevel.y + Size.LEVEL_SIZE / 2;
                    }
                });
            }
        } else {
            mTargetLock = null;
        }

        let dist = VectorUtil.subtract(modelCoords, interaction.start);
        if (!mTargetLock) {
            mDraggedNodes.forEach(node => {
                if (IdUtil.isType(node.id, Data.Element)) {
                    node.targetX = node.startX + dist.x;
                }
                node.targetY = node.startY + dist.y;
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
                mDraggedNodes.forEach(node => {
                    node.startX = null;
                    node.startY = null;
                    node.targetX = null;
                    node.targetY = null;
                    node.interacting = null;
                });

                let elementTargetIds = mDraggedNodes.map(i => i.id).filter(id => IdUtil.isType(id, Data.Element));
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

                let levelTargetIds = mDraggedNodes.map(i => i.id).filter(id => IdUtil.isType(id, Data.Level));
                if (levelTargetIds.length > 0) {
                    let dimension = mModel.getDimension(mDimensionId);
                    let levelsOrdering = dimension.levels.map(l => {
                        let levelNode = mLevels.find(i => i.id == l.id);
                        if (!levelNode) { console.error("Node not found for level id", l.id); return { id: l.id, y: 0 } }
                        return { id: l.id, y: levelNode.y };
                    })
                    levelsOrdering.sort((a, b) => a.y - b.y);
                    mLevelOrderUpdateCallback(mDimensionId, levelsOrdering.map(lo => lo.id));
                }

                if (interaction.startTarget && interaction.startTarget.type == TARGET_AXIS_CONTROL) {
                    let target = mContAxisControlNodes.find(node => node.id == interaction.startTarget.id);
                    let yPos = Math.min(Math.max(modelCoords.y, mAxisTop), mAxisBottom);
                    let percent = (yPos - mAxisTop) / (mAxisBottom - mAxisTop);
                    mUpdateRangeControlCallback(mDimensionId, target.index, percent);
                }

                mSimulation.nodes(simulationNodes());
            }
        } else if (interaction.type == FdlInteraction.LASSO) {
            mOverlayUtil.reset(mZoomTransform);
            mOverlayUtil.drawBubble(interaction.path);
            let selectedIds = mLevels.concat(mNodes).filter(obj => mOverlayUtil.covered(obj)).map(n => n.id);
            return selectedIds;
        } else { console.error("Interaction not supported!"); return; }

        mDraggedNodes = [];
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
        return mNodes.concat(mLevels)
            .concat(mContAxisLinkPoints)
            .concat(mContAxisControlNodes)
            .concat([mDimension, mAddButton]);
    }

    function simulationNodes() {
        return mNodes.concat(mContAxisLinkPoints).concat(mLevels);
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
        setUpdateRangeControlCallback: (func) => mUpdateRangeControlCallback = func,
    }
}
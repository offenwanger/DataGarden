import { ChannelLabels, ChannelType, DIMENSION_RANGE_V1, DIMENSION_RANGE_V2, DIMENSION_SETTINGS_HEIGHT, SimulationValues, DimensionLabels, DimensionType, FdlButtons, FdlInteraction, NO_LEVEL_ID, Padding, Size, AngleType, SizeType, MAP_ELEMENTS } from "../../constants.js";
import { DataModel } from "../../data_model.js";
import { Data } from "../../data_structs.js";
import { DataUtil } from "../../utils/data_util.js";
import { IdUtil } from "../../utils/id_util.js";
import { PathUtil } from "../../utils/path_util.js";
import { VectorUtil } from "../../utils/vector_util.js";

export function FdlDimensionViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap) {
    const DEFAULT_NONE_HEIGHT = 200;
    const ANGLE_LABEL_SIZE = 40;
    const AXIS_PADDING = 10;
    const CONTAINER_COLOR = "#55555530";

    const TARGET_ELEMENT = "element_target";
    const TARGET_LABEL = "dimention_name_target";
    const TARGET_TYPE = "dimention_type_target";
    const TARGET_CHANNEL = "dimention_channel_target";
    const TARGET_TIER = "dimention_tier_target";
    const TARGET_ANGLE = "dimention_angle_setting_target";
    const TARGET_SIZE = "dimention_size_setting_target";
    const TARGET_BUBBLE = "level_bubble";
    const TARGET_CONTROL = "axis_control";
    const TARGET_NONE = "none_target";
    const TARGET_NOT_NONE = "not_none_target";

    const ADD_LEVEL_LABEL = "Add Category +";

    const CONTROL_ID = 'control_node_'

    let mAddLevelCallback = () => { };
    let mEditNameCallback = () => { };
    let mEditDomainCallback = () => { };
    let mEditTypeCallback = () => { };
    let mEditChannelCallback = () => { };
    let mEditTierCallback = () => { };
    let mAngleTypeCallback = () => { };
    let mSizeTypeCallback = () => { };
    let mUpdateLevelCallback = () => { };
    let mLevelOrderUpdateCallback = () => { };
    let mUpdateRangeControlCallback = () => { };

    let mModel = new DataModel();
    let mDimensionId = null;
    let mDimension = null;

    let mZoomTransform = d3.zoomIdentity;

    let mHighlightIds = [];
    let mSelectionIds = [];
    let mWidth = 100;
    let mHeight = 100;

    let mDimensionNode;
    let mLevels = [];
    let mNone = { name: "None", id: NO_LEVEL_ID, x: 0, y: 0 }
    let mNodes = [];
    let mAddButton = { id: FdlButtons.ADD, x: 0, y: 0 };
    let mControls = [];

    let mLevelsX = 0;
    let mElementsX = 1;
    let mElementsAxisX = 1;
    let mYRanges = {};
    let mNodeLayout = {}
    let mScreenEdge = 10;

    let mSettingsTargets = [];
    let mSettingsXs = [];
    let mSettingsY = [];
    let mSettingsWidths = [];
    let mSettingsScale = 1;
    let mSettingsBottom = 10;

    let mDraggedNodes = [];

    let mSimulation = d3.forceSimulation()
        .alphaDecay(SimulationValues.ALPHA)
        .velocityDecay(SimulationValues.VELOCITY)
        .force("collide", d3.forceCollide((d) => IdUtil.isType(d.id, Data.Element) ? d.radius + Padding.NODE * 2 : 0)
            .strength(SimulationValues.STRENGTH_COLLIDE))
        .force("xDrift", d3.forceX(mElementsX)
            .strength(SimulationValues.STRENGTH_X))
        .alpha(0.3)
        .on("tick", () => {
            // if the dimension isn't set yet, return.
            if (!mDimension) { return }

            if (mDraggedNodes.length == 0) updateNodeTargets();
            allItems().forEach(node => {
                if (!node) return;
                if (!node.x) node.x = node.targetX ? node.targetX : 0;
                if (!node.y) node.y = node.targetY ? node.targetY : 0;

                if (node.targetX) {
                    node.x += (node.targetX - node.x) * mSimulation.alpha();
                }
                if (node.targetY) {
                    node.y += (node.targetY - node.y) * mSimulation.alpha();
                }

                if (isNaN(node.x)) { console.error("Invalid x value"); node.x = 0; };
                if (isNaN(node.y)) { console.error("Invalid y value"); node.y = 0; };
            });

            draw();
        }).stop();

    // must be done before updating the simulation data.
    function setDimension(dimensionId) {
        mDimensionId = dimensionId;
    }

    function updateSimulationData(data, model) {
        mModel = model;

        mDimension = mModel.getDimension(mDimensionId);
        if (!mDimension) { console.error("Invalid dimension id", mDimensionId); mDimensionId = null; mDimension = null; draw(); return; }

        mDimensionNode = data.find(node => node.id == mDimension.id);
        mNodes = data.filter(node => IdUtil.isType(node.id, Data.Element) && DataUtil.getTier(mModel, node.id) == mDimension.tier);
        mLevels = data.filter(node => node.dimension == mDimension.id);

        calculateLayoutValues();
        setControlNodes();

        resetTargets();

        mSimulation.nodes(mNodes)
            .force("xDrift", d3.forceX(mElementsX).strength(SimulationValues.STRENGTH_X))
            .alphaTarget(0.3)
            .restart();
    }

    function calculateLayoutValues() {
        mLevelsX = canvasCoordsToLocal({ x: Padding.LEVEL, y: 0 }).x;
        mElementsX = mLevels.concat({ name: ADD_LEVEL_LABEL }).reduce((max, level) => {
            return Math.max(max, mDrawingUtil.measureStringNode(level.name, Size.LEVEL_SIZE));
        }, 10) + Padding.LEVEL * 2;
        mElementsAxisX = mElementsX + AXIS_PADDING + (mDimension.channel == ChannelType.ANGLE ? ANGLE_LABEL_SIZE : 0)
        mScreenEdge = canvasCoordsToLocal({ x: mWidth, y: 0 }).x;

        mYRanges = {};
        if (mDimension.type == DimensionType.DISCRETE) {
            mDimension.levels.forEach(({ id }, index) => {
                mYRanges[id] = getDiscreteYRange(index);
            });
            mYRanges[FdlButtons.ADD] = getDiscreteYRange(mDimension.levels.length);
            mYRanges[NO_LEVEL_ID] = getDiscreteYRange(mDimension.levels.length + 1);
            // y range for the dimension is the space of the actual levels
            mYRanges[mDimension.id] = [DIMENSION_SETTINGS_HEIGHT + Size.LEVEL_SIZE, mYRanges[FdlButtons.ADD][0]];
        } else {
            // it's the whole space.
            mYRanges[mDimension.id] = getContinuousYRange(false);
            mYRanges[NO_LEVEL_ID] = getContinuousYRange(true);
        }

        calculateNodeLayout();

    }

    function calculateNodeLayout() {
        let minSize, maxSize, sizeRange;
        if (mDimension.channel == ChannelType.SIZE) {
            mNodes.forEach(n => {
                if (mDimension.unmappedIds.includes(n.id)) return;
                let element = mModel.getElement(n.id);
                if (mDimension.sizeType == SizeType.LENGTH) {
                    n.size = PathUtil.getPathLength(element.spine);
                } else {
                    let bb = DataUtil.getBoundingBox(element);
                    n.size = bb.height * bb.width;
                }
            });

            minSize = Math.min(Infinity, ...mNodes.filter(n => n.size).map(n => n.size));
            maxSize = Math.max(-Infinity, ...mNodes.filter(n => n.size).map(n => n.size));
            if (minSize == Infinity) minSize = 0;
            if (maxSize == -Infinity) maxSize = minSize + 1;
            sizeRange = maxSize - minSize;
        }

        mNodes.forEach((node) => {
            if (mDimension.unmappedIds.includes(node.id)) return;

            let yPercent = 0;
            if (mDimension.channel == ChannelType.ANGLE) {
                let element = mModel.getElement(node.id);
                let angle = DataUtil.getRelativeAngle(element, mDimension.angleType == AngleType.RELATIVE ? mModel.getElement(element.parentId) : null)
                yPercent = DataUtil.angleToPercent(angle);
            } else if (mDimension.channel == ChannelType.SIZE) {
                yPercent = (node.size - minSize) / sizeRange
            } else if (mDimension.channel == ChannelType.POSITION) {
                yPercent = node.parentProjection ? node.parentProjection.percent : 0;
            }

            mNodeLayout[node.id] = {
                y: (mYRanges[mDimension.id][1] - mYRanges[mDimension.id][0]) * yPercent + mYRanges[mDimension.id][0]
            };
            if (mSelectionIds.includes(node.id)) mNodeLayout[node.id].x = mElementsX + Size.ELEMENT_NODE_SIZE + Padding.NODE;
        });
    }

    function setControlNodes() {
        mControls = [];
        if (mDimension.type == DimensionType.CONTINUOUS) {
            let v1Y = (mYRanges[mDimension.id][1] - mYRanges[mDimension.id][0]) * mDimension.domainRange[0] + mYRanges[mDimension.id][0];
            let v2Y = (mYRanges[mDimension.id][1] - mYRanges[mDimension.id][0]) * mDimension.domainRange[1] + mYRanges[mDimension.id][0];
            mControls.push({ id: CONTROL_ID + DIMENSION_RANGE_V1, index: DIMENSION_RANGE_V1, x: mElementsX, y: v1Y });
            mControls.push({ id: CONTROL_ID + DIMENSION_RANGE_V2, index: DIMENSION_RANGE_V2, x: mElementsX, y: v2Y });
        } else if (mDimension.channel == ChannelType.ANGLE || mDimension.channel == ChannelType.POSITION || mDimension.channel == ChannelType.SIZE) {
            mControls.push({ id: CONTROL_ID + "-1", index: -1, x: mElementsX, y: mYRanges[mDimension.id][0] });
            mDimension.ranges.forEach((range, index) => {
                mControls.push({
                    id: CONTROL_ID + index,
                    index,
                    x: mElementsX,
                    y: (mYRanges[mDimension.id][1] - mYRanges[mDimension.id][0]) * range + mYRanges[mDimension.id][0],
                });
            })
            mControls.push({ id: CONTROL_ID + mDimension.ranges.length, index: mDimension.ranges.length, x: mElementsX, y: mYRanges[mDimension.id][1] });
        }
    }

    function getDiscreteYRange(index) {
        let top = DIMENSION_SETTINGS_HEIGHT + Size.LEVEL_SIZE + Padding.LEVEL * 2;
        let levelheight = (mHeight - top - Size.LEVEL_SIZE - Padding.LEVEL * 2) / (mDimension.levels.length + 1);

        if (index == mDimension.levels.length + 1) {
            // none is at the bottom
            let y1 = mHeight - levelheight + Padding.LEVEL;
            let y2 = mHeight - Padding.LEVEL;
            return [y1, y2];
        } else if (index == mDimension.levels.length) {
            // the add category button space is above none
            let y1 = mHeight - levelheight - Size.LEVEL_SIZE - Padding.LEVEL;
            let y2 = mHeight - levelheight - Padding.LEVEL;
            return [y1, y2]
        } else {
            if (mDimension.channel == ChannelType.FORM || mDimension.channel == ChannelType.COLOR) {
                let y1 = top + index * levelheight + Padding.LEVEL;
                let y2 = y1 + levelheight - Padding.LEVEL;
                return [y1, y2];
            } else {
                let r1 = index == 0 ? 0 : mDimension.ranges[index - 1];
                let r2 = index == mDimension.ranges.length ? 1 : mDimension.ranges[index];
                let availableHeight = levelheight * mDimension.levels.length;
                let y1 = top + r1 * availableHeight + Padding.LEVEL;
                let y2 = top + r2 * availableHeight + Padding.LEVEL;
                return [y1, y2];
            }
        }
    }

    function getContinuousYRange(isNone) {
        if (isNone) {
            let y1 = mHeight - DEFAULT_NONE_HEIGHT;
            let y2 = mHeight;
            return [y1, y2];
        } else {
            let top = DIMENSION_SETTINGS_HEIGHT + Size.LEVEL_SIZE + Padding.LEVEL * 2;
            let height = mHeight - top - DEFAULT_NONE_HEIGHT - (Size.LEVEL_SIZE + Padding.LEVEL * 2);
            if (height < 1) height = 1;
            return [top, top + height];
        }
    }

    function resetTargets() {
        if (mDimension.type == DimensionType.DISCRETE) {
            mAddButton.targetY = rangeAverage(mYRanges[FdlButtons.ADD]) - Size.LEVEL_SIZE / 2;
            mAddButton.targetX = mLevelsX;
        }

        mNone.targetY = rangeAverage(mYRanges[NO_LEVEL_ID]) - Size.LEVEL_SIZE / 2;
        mNone.targetX = mLevelsX;

        updateLevelTargets();
        updateNodeTargets();
    }

    function updateLevelTargets() {
        mLevels.forEach(levelNode => {
            if (levelNode.id == DIMENSION_RANGE_V1) {
                levelNode.targetY = mControls.find(c => c.id == CONTROL_ID + DIMENSION_RANGE_V1).y;
            } else if (levelNode.id == DIMENSION_RANGE_V2) {
                levelNode.targetY = mControls.find(c => c.id == CONTROL_ID + DIMENSION_RANGE_V2).y; - Size.LEVEL_SIZE;
            } else if (IdUtil.isType(levelNode.id, Data.Level)) {
                if (mDimension.channel == ChannelType.FORM || mDimension.channel == ChannelType.COLOR) {
                    levelNode.targetY = rangeAverage(mYRanges[levelNode.id]) - Size.LEVEL_SIZE / 2;
                } else {
                    let index = mDimension.levels.findIndex(l => l.id == levelNode.id);
                    let range = [mControls.find(c => c.index == index - 1).y, mControls.find(c => c.index == index).y];
                    levelNode.targetY = rangeAverage(range) - Size.LEVEL_SIZE / 2;
                }
            } else {
                console.error("Invalid level id", levelNode.id)
            }
            levelNode.targetX = mLevelsX;
        })
    }

    function updateNodeTargets() {
        mNodes.forEach(node => {
            if (mDimension.unmappedIds.includes(node.id)) {
                let yRange = mYRanges[NO_LEVEL_ID];
                node.targetY = Math.max(Math.min(node.y, yRange[1] - Size.ELEMENT_NODE_SIZE + Padding.NODE), yRange[0] + Size.ELEMENT_NODE_SIZE + Padding.NODE);
                node.targetX = Math.max(Math.min(node.x, mScreenEdge - Size.ELEMENT_NODE_SIZE + Padding.NODE), mElementsX + Size.ELEMENT_NODE_SIZE + Padding.NODE);
            } else if (mDimension.channel == ChannelType.FORM || mDimension.channel == ChannelType.COLOR) {
                let level = mDimension.levels.find(l => l.elementIds.includes(node.id));
                let levelId = level ? level.id : NO_LEVEL_ID;
                let yRange = mYRanges[levelId];
                node.targetY = DataUtil.limit(node.y,
                    yRange[0] + Size.ELEMENT_NODE_SIZE + Padding.NODE,
                    yRange[1] - Size.ELEMENT_NODE_SIZE + Padding.NODE);
                node.targetX = DataUtil.limit(node.x,
                    mElementsX + Size.ELEMENT_NODE_SIZE + Padding.NODE,
                    mScreenEdge - Size.ELEMENT_NODE_SIZE + Padding.NODE);
            } else {
                node.targetY = mNodeLayout[node.id].y;
                // x may be undefined
                node.targetX = mNodeLayout[node.id].x ? mNodeLayout[node.id].x : node.x;
                node.targetX = DataUtil.limit(node.targetX,
                    mElementsAxisX + Size.ELEMENT_NODE_SIZE + Padding.NODE,
                    mScreenEdge - Size.ELEMENT_NODE_SIZE + Padding.NODE);

            }
        });
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

    function onResize(width, height) {
        mWidth = width;
        mHeight = height;
        calculateLayoutValues();
        resetTargets();
        draw();
    }

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        // we haven't been set yet, don't draw.
        if (!mDimension) return;

        // Only draw if we are valid
        if (DataUtil.dimensionValid(mDimension)) {
            let header;
            if (mDimension.type == DimensionType.DISCRETE) {
                header = "Categories"
                drawAddButton();
            } else {
                header = "Domain"
            }

            mDrawingUtil.drawStringNode({
                label: header,
                x: 10,
                y: mSettingsBottom + Padding.LEVEL,
                height: Size.LEVEL_SIZE,
                box: false
            })

            if (mDimension.channel == ChannelType.FORM || mDimension.channel == ChannelType.COLOR) {
                mLevels.forEach(({ id }) => drawContainer(id));
            } else {
                drawChannelRange();
                // draw the dimention range(s)
                mDrawingUtil.drawLine({
                    x1: mControls[0].x,
                    y1: mControls[0].y,
                    x2: mControls[mControls.length - 1].x,
                    y2: mControls[mControls.length - 1].y
                });
            }

            // mLevels includes the range labels
            mLevels.forEach(level => drawLevelLabel(level));
            drawNoneLabel()
            drawContainer(NO_LEVEL_ID)
            mControls.forEach(c => drawControlNode(c));

            let elements = mNodes.map(n => mModel.getElement(n.id));
            // Draw dragged nodes after non-dragged nodes
            let draggedIds = mDraggedNodes.map(n => n.id);

            if (mDimension.channel == ChannelType.ANGLE || mDimension.channel == ChannelType.POSITION || mDimension.channel == ChannelType.SIZE) {
                mNodes.filter(node => !mDimension.unmappedIds.includes(node.id) && !node.interacting).forEach(node => drawNodeLinkLine(node))
            }
            mNodes.filter(n => !draggedIds.includes(n.id)).forEach(node => drawNode(node, elements.find(e => e.id == node.id)));
            mNodes.filter(n => draggedIds.includes(n.id)).forEach(node => drawNode(node, elements.find(e => e.id == node.id)))

            if (mDraggedNodes.length > 0 && (mDimension.channel == ChannelType.ANGLE || mDimension.channel == ChannelType.POSITION || mDimension.channel == ChannelType.SIZE)) {
                mDrawingUtil.drawRect({
                    x: mControls[0].x,
                    y: mControls[0].y,
                    width: mScreenEdge - mControls[0].x,
                    height: mControls[mControls.length - 1].y - mControls[0].y,
                    color: "#00000000",
                    code: mCodeUtil.getCode(MAP_ELEMENTS, TARGET_NOT_NONE),
                })
            }
        }

        drawSettings();
    }

    function drawAddButton() {
        mDrawingUtil.drawStringNode({
            x: mAddButton.x,
            y: mAddButton.y,
            label: ADD_LEVEL_LABEL,
            height: Size.LEVEL_SIZE,
            outline: mSelectionIds.includes(FdlButtons.ADD) ? mColorMap(FdlButtons.ADD) : null,
            shadow: mHighlightIds.includes(FdlButtons.ADD),
            code: mCodeUtil.getCode(FdlButtons.ADD)
        });
    }

    function drawNoneLabel() {
        mDrawingUtil.drawStringNode({
            label: mNone.name,
            x: mNone.x,
            y: mNone.y,
            height: Size.LEVEL_SIZE,
            box: false,
            outline: 'white',
            code: mCodeUtil.getCode(mNone.id, TARGET_NONE),
        });
    }

    function drawContainer(id) {
        mDrawingUtil.drawRect({
            x: mElementsX,
            y: mYRanges[id][0],
            height: mYRanges[id][1] - mYRanges[id][0],
            width: mScreenEdge - mElementsX,
            shadow: mHighlightIds.includes(id),
            color: CONTAINER_COLOR,
            code: mDraggedNodes.length > 0 ? mCodeUtil.getCode(id, TARGET_BUBBLE) : null,
        })

        mDrawingUtil.drawLine({
            x1: mElementsX,
            x2: mElementsX,
            y1: mYRanges[id][0],
            y2: mYRanges[id][1],
            width: 1,
            color: "black",
        })
    }

    function drawControlNode(controlNode) {
        let drawCode = mDimension.type == DimensionType.CONTINUOUS ||
            controlNode.index > -1 && controlNode.index < mDimension.ranges.length;
        mDrawingUtil.drawColorCircle({
            x: controlNode.x,
            y: controlNode.y,
            r: AXIS_PADDING - 2,
            color: 'white',
            code: drawCode ? mCodeUtil.getCode(controlNode.id, TARGET_CONTROL) : null,
        })
    }

    function drawChannelRange() {
        let yRange = mYRanges[mDimension.id];
        if (mDimension.channel == ChannelType.ANGLE) {
            let images = [
                null,
                "img/deg135_neg.png",
                "img/deg90_neg.png",
                "img/deg45_neg.png",
                null,
                "img/deg45_pos.png",
                "img/deg90_pos.png",
                "img/deg135_pos.png",
                null,
            ]
            images.forEach((img, index) => {
                if (img) {
                    let yRange = mYRanges[mDimension.id];
                    let yPos = (yRange[1] - yRange[0]) * index / images.length + yRange[0];
                    mDrawingUtil.drawImage({
                        x: mElementsX + Padding.LEVEL / 2,
                        y: yPos,
                        height: ANGLE_LABEL_SIZE,
                        width: ANGLE_LABEL_SIZE,
                        url: img
                    })
                }
            })
        } else if (mDimension.channel == ChannelType.POSITION) {
            mDrawingUtil.drawStringNode({
                label: "Start of Parent",
                x: mElementsAxisX,
                y: yRange[0] - (Size.LEVEL_SIZE),
                height: Size.LEVEL_SIZE,
                box: false,
            });
            mDrawingUtil.drawStringNode({
                label: "End of Parent",
                x: mElementsAxisX,
                y: yRange[1] + (Padding.LEVEL),
                height: Size.LEVEL_SIZE,
                box: false,
            });
        } else if (mDimension.channel == ChannelType.SIZE) {
            mDrawingUtil.drawStringNode({
                label: "Smallest Element",
                x: mElementsAxisX,
                y: yRange[0] - (Size.LEVEL_SIZE),
                height: Size.LEVEL_SIZE,
                box: false,
            });
            mDrawingUtil.drawStringNode({
                label: "Largest Element",
                x: mElementsAxisX,
                y: yRange[1] + (+ Padding.LEVEL),
                height: Size.LEVEL_SIZE,
                box: false,
            });
        }

        mDrawingUtil.drawLine({
            x1: mElementsAxisX,
            x2: mElementsAxisX,
            y1: yRange[0],
            y2: yRange[1]
        });
    }

    function drawLevelLabel(levelItem) {
        mDrawingUtil.drawStringNode({
            x: levelItem.x,
            y: levelItem.y,
            label: levelItem.name,
            height: Size.LEVEL_SIZE,
            shadow: mHighlightIds.includes(levelItem.id),
            code: mCodeUtil.getCode(levelItem.id, TARGET_LABEL),
            outline: mSelectionIds.includes(levelItem.id) ? mColorMap(levelItem.id) : null,
            background: levelItem.invalid ? "#FF6865" : "white"
        });
    }

    function drawNodeLinkLine(node) {
        mDrawingUtil.drawLine({
            x1: mElementsAxisX,
            x2: node.x,
            y1: node.y,
            y2: node.y,
            dash: 3,
        });
    }

    function drawNode(node, element) {
        let strokes = element.strokes;
        if (mDimension.channel == ChannelType.FORM) {
            strokes = DataUtil.getStraightenedStrokes(element);
        }
        mDrawingUtil.drawThumbnailCircle({
            strokes,
            cx: node.x,
            cy: node.y,
            r: node.radius,
            shadow: mHighlightIds.includes(node.id),
            outline: mSelectionIds.includes(node.id) ? mColorMap(node.id) : null,
            code: node.interacting ? null : mCodeUtil.getCode(node.id, TARGET_ELEMENT)
        });
    }

    function drawSettings() {
        mDrawingUtil.drawRect({
            x: 0,
            y: 0,
            width: mScreenEdge,
            height: mSettingsBottom,
            color: "white",
            // wipe out any other interactions under this
            code: "#00000000"
        })
        mDrawingUtil.drawLine({ x1: 0, x2: mScreenEdge, y1: mSettingsBottom, y2: mSettingsBottom });

        let labels = ["Name", "Type", "Level", "Channel"];
        let strings = [mDimensionNode.name, DimensionLabels[mDimensionNode.type], "Level " + mDimensionNode.tier, ChannelLabels[mDimensionNode.channel]];
        let valid = [true, DataUtil.dimensionTypeValid(mDimensionNode), DataUtil.dimensionTierValid(mDimensionNode), DataUtil.dimensionChannelValid(mDimensionNode)];
        mSettingsTargets = [TARGET_LABEL, TARGET_TYPE, TARGET_TIER, TARGET_CHANNEL];

        if (mDimensionNode.channel == ChannelType.ANGLE) {
            strings.push("Absolute");
            labels.push("Dependency");
            valid.push(true);
            mSettingsTargets.push(TARGET_ANGLE);
        } else if (mDimensionNode.channel == ChannelType.SIZE) {
            strings.push("Length");
            labels.push("Metric");
            valid.push(true);
            mSettingsTargets.push(TARGET_SIZE);
        }

        mSettingsWidths = strings.map((s, i) => Math.max(
            mDrawingUtil.measureStringNode(s, Size.LEVEL_SIZE),
            mDrawingUtil.measureStringNode(labels[i], Size.LEVEL_SIZE)));
        let totalWidth = mSettingsWidths.reduce((s, v) => s + v + Padding.LEVEL, 0)
        mSettingsScale = (totalWidth + 10) < mWidth ? 1 : mWidth / (totalWidth + 10);
        mSettingsBottom = canvasCoordsToLocal({ x: 0, y: DIMENSION_SETTINGS_HEIGHT }).y;

        mSettingsXs = new Array(mSettingsWidths.length).fill('')
            .map((_, i) => mSettingsWidths.slice(0, i).reduce((s, v) => s + v * mSettingsScale + Padding.LEVEL, 0) + Padding.LEVEL);

        let labelY = canvasCoordsToLocal({ x: 0, y: DIMENSION_SETTINGS_HEIGHT - (Size.LEVEL_SIZE * mSettingsScale) * 2 - Padding.LEVEL }).y;
        mSettingsY = canvasCoordsToLocal({ x: 0, y: DIMENSION_SETTINGS_HEIGHT - Size.LEVEL_SIZE * mSettingsScale - Padding.LEVEL }).y;

        strings.forEach((string, index) => {
            mDrawingUtil.drawStringNode({
                x: mSettingsXs[index],
                y: labelY,
                label: labels[index],
                height: Size.LEVEL_SIZE * mSettingsScale,
                box: false
            });

            mDrawingUtil.drawStringNode({
                x: mSettingsXs[index],
                y: mSettingsY,
                label: string,
                height: Size.LEVEL_SIZE * mSettingsScale,
                shadow: mHighlightIds.includes(mDimensionNode.id),
                code: mCodeUtil.getCode(mDimensionNode.id, mSettingsTargets[index]),
                background: valid[index] ? DataUtil.getTierColor(mDimensionNode.tier) : "#FF6865",
            });
        })
    }

    function getSettingsBoundingBox(targetId) {
        let index = mSettingsTargets.findIndex(t => t == targetId);
        if (index == -1) { console.error("invalid target", targetId); return { x: 0, y: 0 } };
        return { x: mSettingsXs[index] - 10, y: mSettingsY - 1, width: mSettingsWidths[index], height: Size.LEVEL_SIZE * mSettingsScale };
    }

    function start() {
        mSimulation.alphaTarget(0.3).restart();
    }

    function stop() {
        mSimulation.stop();
    }

    function interactionStart(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        if (interaction.startTarget && interaction.startTarget.type == TARGET_CONTROL) {
            mDraggedNodes = [interaction.startTarget];
            mControls.forEach(node => node.startY = node.y);
        } else {
            mDraggedNodes = allItems().filter(n => interaction.target.includes(n.id));
            mDraggedNodes.forEach(node => {
                node.startX = node.x;
                node.startY = node.y;
                node.interacting = true;
            });
        }

        mSimulation.nodes(mNodes.filter(n => !interaction.target.includes(n.id)));
    }

    function interactionDrag(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        let dist = VectorUtil.subtract(modelCoords, interaction.start);
        mDraggedNodes.filter(n => mDimension.type == DimensionType.DISCRETE &&
            IdUtil.isType(n.id, Data.Level)).forEach(l => {
                l.targetY = l.startY + dist.y;
            })

        mDraggedNodes.filter(n => IdUtil.isType(n.id, Data.Element)).forEach(n => {
            n.targetX = n.startX + dist.x;
            n.targetY = n.startY + dist.y;
        })

        if (interaction.startTarget && interaction.startTarget.type == TARGET_CONTROL) {
            let targetIndex = mControls.findIndex(c => c.id == interaction.startTarget.id);
            mControls[targetIndex].targetY = Math.min(Math.max(modelCoords.y, mYRanges[mDimension.id][0]), mYRanges[mDimension.id][1]);
            mControls.forEach((node, index) => {
                if (index < targetIndex) {
                    if (node.startY > mControls[targetIndex].targetY) {
                        node.targetY = mControls[targetIndex].targetY;
                    } else {
                        node.targetY = node.startY
                    }
                } else if (index > targetIndex) {
                    if (node.startY < mControls[targetIndex].targetY) {
                        node.targetY = mControls[targetIndex].targetY;
                    } else {
                        node.targetY = node.startY
                    }
                }
            });
            updateLevelTargets();
        } if (interaction.mouseOverTarget && (IdUtil.isType(interaction.mouseOverTarget.id, Data.Level) || interaction.mouseOverTarget.id == NO_LEVEL_ID)) {
            let yRange = mYRanges[interaction.mouseOverTarget.id];
            mDraggedNodes.forEach(node => {
                if (IdUtil.isType(node.id, Data.Element)) {
                    node.targetY = Math.max(Math.min(node.targetY, yRange[1] - Size.ELEMENT_NODE_SIZE + Padding.NODE), yRange[0] + Size.ELEMENT_NODE_SIZE + Padding.NODE);
                    node.targetX = Math.max(Math.min(node.targetX, mScreenEdge - Size.ELEMENT_NODE_SIZE + Padding.NODE), mElementsX + Size.ELEMENT_NODE_SIZE + Padding.NODE);
                }
            });
        }
    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.type == FdlInteraction.SELECTION) {
            if (VectorUtil.dist(interaction.start, modelCoords) < 5 && interaction.startTarget) {
                // Handle Click
                if (interaction.startTarget && interaction.startTarget.id == mDimension.id) {
                    let targetBB = getSettingsBoundingBox(interaction.startTarget.type);
                    if (interaction.startTarget.type == TARGET_LABEL) {
                        mEditNameCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_TYPE) {
                        mEditTypeCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_CHANNEL) {
                        mEditChannelCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_TIER) {
                        mEditTierCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_ANGLE) {
                        mAngleTypeCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else if (interaction.startTarget.type == TARGET_SIZE) {
                        mSizeTypeCallback(interaction.startTarget.id, targetBB.x, targetBB.y, targetBB.width, targetBB.height);
                    } else {
                        console.error("Unsupported Target Type", interaction.startTarget.type);
                    }
                } else if (interaction.startTarget && IdUtil.isType(interaction.startTarget.id, Data.Level)) {
                    let levelNode = mLevels.find(l => l.id == interaction.startTarget.id);
                    if (!levelNode) { console.error("Invalid level id", interaction.startTarget.id); return; }
                    mEditNameCallback(interaction.startTarget.id, levelNode.x, levelNode.y,
                        mDrawingUtil.measureStringNode(levelNode.name, Size.LEVEL_SIZE), Size.LEVEL_SIZE);
                } else if (interaction.startTarget && interaction.endTarget && interaction.endTarget.id == FdlButtons.ADD) {
                    mAddLevelCallback(mDimension.id);
                } else if (interaction.startTarget && (interaction.startTarget.id == DIMENSION_RANGE_V2 || interaction.startTarget.id == DIMENSION_RANGE_V1)) {
                    let node = mLevels.find(l => l.id == interaction.startTarget.id);
                    mEditDomainCallback(mDimension.id, interaction.startTarget.id, node.x, node.y,
                        mDrawingUtil.measureStringNode(node.name, Size.LEVEL_SIZE), Size.LEVEL_SIZE)
                }
            } else if (interaction.startTarget && interaction.startTarget.type == TARGET_CONTROL) {
                let target = mControls.find(node => node.id == interaction.startTarget.id);
                let yPos = Math.min(Math.max(modelCoords.y, mYRanges[mDimension.id][0]), mYRanges[mDimension.id][1]);
                let percent = (yPos - mYRanges[mDimension.id][0]) / (mYRanges[mDimension.id][1] - mYRanges[mDimension.id][0]);
                mUpdateRangeControlCallback(mDimensionId, target.index, percent);
            } else {
                let elementTargetIds = mDraggedNodes.map(i => i.id).filter(id => IdUtil.isType(id, Data.Element));
                if (elementTargetIds.length > 0) {
                    if (interaction.endTarget && IdUtil.isType(interaction.endTarget.id, Data.Level)) {
                        mUpdateLevelCallback(mDimension.id, interaction.endTarget.id, elementTargetIds);
                    } else if (interaction.endTarget && IdUtil.isType(interaction.endTarget.id, Data.Element)) {
                        let levelTarget = mModel.getLevelForElement(mDimension.id, interaction.endTarget.id);
                        mUpdateLevelCallback(mDimension.id, levelTarget, elementTargetIds);
                    } else if (interaction.endTarget && interaction.endTarget.id == NO_LEVEL_ID) {
                        mUpdateLevelCallback(mDimension.id, NO_LEVEL_ID, elementTargetIds);
                    } else if (interaction.endTarget && interaction.endTarget.id == MAP_ELEMENTS) {
                        mUpdateLevelCallback(mDimension.id, MAP_ELEMENTS, elementTargetIds);
                    }
                }

                let levelTargetIds = mDraggedNodes.map(i => i.id).filter(id => IdUtil.isType(id, Data.Level));
                if (levelTargetIds.length > 0) {
                    let levelsOrdering = mDimension.levels.map(l => {
                        let levelNode = mLevels.find(i => i.id == l.id);
                        if (!levelNode) { console.error("Node not found for level id", l.id); return { id: l.id, y: 0 } }
                        return { id: l.id, y: levelNode.y };
                    })
                    levelsOrdering.sort((a, b) => a.y - b.y);
                    mLevelOrderUpdateCallback(mDimension.id, levelsOrdering.map(lo => lo.id));
                }

                mSimulation.nodes(mNodes);
            }
        } else if (interaction.type == FdlInteraction.LASSO) {
            mOverlayUtil.reset(mZoomTransform);
            mOverlayUtil.drawBubble(interaction.path);
            let selectedIds = mLevels.concat(mNodes).filter(obj => mOverlayUtil.covered(obj)).map(n => n.id);
            return selectedIds;
        } else { console.error("Interaction not supported!"); return; }

        mDraggedNodes.forEach(node => {
            node.startX = null;
            node.startY = null;
            node.interacting = null;
        });
        resetTargets();

        mDraggedNodes = [];
    }

    function pan(x, y) {

    }

    function zoom(x, y, scale) {

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
            .concat(mControls)
            .concat([mDimensionNode, mAddButton, mNone]);
    }

    function canvasCoordsToLocal(canvasCoords) {
        return {
            x: (canvasCoords.x - mZoomTransform.x) * mZoomTransform.k,
            y: (canvasCoords.y - mZoomTransform.y) * mZoomTransform.k
        }
    }

    function rangeAverage(range) {
        return (range[1] - range[0]) / 2 + range[0];
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
        onResize,
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
        setAngleTypeCallback: (func) => mAngleTypeCallback = func,
        setSizeTypeCallback: (func) => mSizeTypeCallback = func,
        setUpdateLevelCallback: (func) => mUpdateLevelCallback = func,
        setLevelOrderUpdateCallback: (func) => mLevelOrderUpdateCallback = func,
        setUpdateRangeControlCallback: (func) => mUpdateRangeControlCallback = func,
    }
}
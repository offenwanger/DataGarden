
function StructViewController() {
    const DRAG_MOVE = "moveDrag";
    const DRAG_SELECT = "selectDrag"

    const TARGET_LINK_POSITION = 'positionLinkTarget';
    const TARGET_LINK_ORIENTATION = 'orientationLinkTarget';
    const TARGET_LINK_FORM = 'formLinkTarget';
    const TARGET_LINK_NUMBER = 'numberLinkTarget';
    const TARGET_GROUP = 'groupTarget';
    const TARGET_DIMENTION = 'dimentionTarget';

    const GROUP_PADDING = 10;

    let mCanvas = d3.select('#struct-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#struct-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#struct-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);
    let mDrawingUtil = new DrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d"),
        mInterfaceCanvas.node().getContext("2d"),
    );

    let mHighlightCallback = () => { };
    let mSelectionCallback = () => { };
    let mDimentionCreationCallback = () => { };
    let mMoveObjectsCallback = () => { };
    let mLinkCallback = () => { };
    let mHighlightObjectIds = null;


    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 1;

    let mZoomTransform = d3.zoomIdentity;

    let mModel = new DataModel();
    let mInteraction;
    let mSelectedObjectIds = null;

    function onModelUpdate(model) {
        mModel = model;
        draw();
        drawInterface();
    }

    function onPointerDown(screenCoords, toolState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect()))
            return false;

        if (toolState == Buttons.PANNING_BUTTON) {
            mInteraction = {
                x: mZoomTransform.x,
                y: mZoomTransform.y,
                scale: mZoomTransform.k,
                screenCoords,
            }

            return true;
        } else if (toolState == Buttons.ZOOM_BUTTON) {
            let zoomCenter = screenToModelCoords(screenCoords)
            mInteraction = {
                pointerX: zoomCenter.x,
                pointerY: zoomCenter.y,
                transformX: mZoomTransform.x,
                transformY: mZoomTransform.y,
                scale: mZoomTransform.k,
                screenCoords,
            }

            return true;
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            mInteraction = { start: screenToModelCoords(screenCoords) }

            let target = getInteractionTarget(screenCoords);
            if (target) {
                if (!mSelectedObjectIds || !mSelectedObjectIds.find(id => id == target.id)) {
                    // item not in selection
                    mSelectedObjectIds = [target.id];
                    mSelectionCallback(mSelectedObjectIds);
                }
                mInteraction.type = DRAG_MOVE;
                mInteraction.originalModel = mModel.clone();
                draw();
            } else {
                mSelectedObjectIds = null;
                mSelectionCallback(null);
                mInteraction.type = DRAG_SELECT;
            }
            drawInterface();
        }
    }


    function onPointerMove(screenCoords, toolState) {
        if (toolState == Buttons.PANNING_BUTTON && mInteraction) {
            let mouseDist = MathUtil.subtract(screenCoords, mInteraction.screenCoords);
            let translate = MathUtil.add(mInteraction, mouseDist);
            mZoomTransform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mInteraction.scale);
            draw();
            drawInterface();
        } else if (toolState == Buttons.ZOOM_BUTTON && mInteraction) {
            let mouseDist = screenCoords.y - mInteraction.screenCoords.y;
            let scale = mInteraction.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
            let zoomChange = scale - mInteraction.scale;
            let transformX = -(mInteraction.pointerX * zoomChange) + mInteraction.transformX;
            let transformY = -(mInteraction.pointerY * zoomChange) + mInteraction.transformY;
            let transform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
            mZoomTransform = transform;
            draw();
            drawInterface();
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            if (mInteraction) {
                let moveDiff = MathUtil.subtract(screenToModelCoords(screenCoords), mInteraction.start);
                if (mInteraction.type == DRAG_MOVE) {
                    mModel = mInteraction.originalModel.clone();
                    let objects = mModel.getDimentions().concat(mModel.getGroups()).filter(o => mSelectedObjectIds.includes(o.id));
                    objects.forEach(o => {
                        o.structX += moveDiff.x;
                        o.structY += moveDiff.y;
                    });
                    draw();
                    drawInterface();
                } else if (mInteraction.type == DRAG_SELECT) {

                } else {
                    console.error("Bad state", mInteraction);
                }
            } else {
                if (!ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
                    let target = getInteractionTarget(screenCoords);
                    if (target) {
                        mHighlightObjectIds = [target.id];
                        mHighlightCallback(mHighlightObjectIds);
                    } else {
                        mHighlightObjectIds = null;
                        mHighlightCallback(null);
                    }
                }
                drawInterface();
            }
        }

        if (mHighlightObjectIds && toolState != Buttons.SELECTION_BUTTON) {
            mHighlightObjectIds = null;
            drawInterface();
        }
    }

    function onPointerUp(screenCoords, toolState) {
        let interaction = mInteraction;
        mInteraction = null;
        if (interaction && interaction.type == DRAG_MOVE) {
            let moveDiff = MathUtil.subtract(screenToModelCoords(screenCoords), interaction.start);
            if (MathUtil.length(moveDiff) > 5) {
                let dropTarget = getInteractionTarget(screenCoords);
                if (dropTarget) {
                    if (mSelectedObjectIds.length == 1 && IdUtil.isType(mSelectedObjectIds[0], Data.Dimention))
                        if (dropTarget.type == TARGET_LINK_POSITION) {
                            mLinkCallback(dropTarget.id, mSelectedObjectIds[0], ChannelTypes.POSITION)
                        } else if (dropTarget.type == TARGET_LINK_ORIENTATION) {
                            mLinkCallback(dropTarget.id, mSelectedObjectIds[0], ChannelTypes.ORIENTATION)
                        } else if (dropTarget.type == TARGET_LINK_FORM) {
                            mLinkCallback(dropTarget.id, mSelectedObjectIds[0], ChannelTypes.FORM)
                        } else if (dropTarget.type == TARGET_LINK_NUMBER) {
                            mLinkCallback(dropTarget.id, mSelectedObjectIds[0], ChannelTypes.NUMBER)
                        } else {
                            console.error("Invalid drop target", dropTarget);
                        }
                } else {
                    mMoveObjectsCallback(mSelectedObjectIds, moveDiff)
                }
            } else {
                console.error("Subselect!")
            }
        }

        draw();
        mInteraction = false;
    }

    function onResize(height, width) {
        d3.select("#struct-view")
            .style('width', height + "px")
            .style('height', width + "px");
        mCanvas
            .attr('width', height)
            .attr('height', width);
        mInterfaceCanvas
            .attr('width', height)
            .attr('height', width);
        mInteractionCanvas
            .attr('width', height)
            .attr('height', width);
        draw();
        drawInterface();
    }

    function onLongPress(screenCoords, toolState) {
        if (toolState == Buttons.SELECTION_BUTTON) {
            mDimentionCreationCallback(screenToModelCoords(screenCoords));
        }
    }

    function highlight(ids) {
        if (!ids || (Array.isArray(ids) && ids.length == 0)) {
            mHighlightObjectIds = null;
        } else {
            mHighlightObjectIds = ids.filter(id => IdUtil.isType(id, Data.Group));
            mHighlightObjectIds.push(...ids.filter(id => IdUtil.isType(id, Data.Element)).map(eId => mModel.getGroupForElement(eId).id));
            mHighlightObjectIds.push(...ids.filter(id => IdUtil.isType(id, Data.Stroke)).map(sId => mModel.getGroupForElement(sId).id));
            mHighlightObjectIds = mHighlightObjectIds.filter((groupId, index, self) => self.findIndex(gId => gId == groupId) == index);
        }
        drawInterface();
    }


    function draw() {
        mDrawingUtil.reset(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);
        mModel.getGroups().filter(g => g.parentId).forEach(group => {
            let parent = mModel.getGroup(group.parentId);
            if (!parent) { console.error("Bad state, parent not found!"); return; }
            let groupConnectorPoint = { x: group.structX + Size.ICON_LARGE / 2, y: group.structY };
            let parentConnectorPoint = { x: parent.structX + Size.ICON_LARGE / 2, y: parent.structY + Size.ICON_LARGE };
            mDrawingUtil.drawConnector(parentConnectorPoint, groupConnectorPoint, null, null);
        })

        mModel.getMappings().forEach(mapping => {
            drawMapping(mapping, mModel.getGroup(mapping.groupId), mModel.getDimention(mapping.dimentionId));
        })

        mModel.getGroups().forEach(g => {
            drawGroup(g);
        })

        mModel.getDimentions().forEach(d => {
            drawDimention(d);
        })
    }

    function drawGroup(group) {
        let code = null;
        if (mInteraction) {

        } else {
            code = getCode(group.id, TARGET_GROUP);
        }

        mDrawingUtil.drawContainerRect(group.structX, group.structY, Size.ICON_LARGE, Size.ICON_LARGE, code);
        let boundingBox = PathUtil.getBoundingBox(group.elements.map(e => e.strokes.map(s => PathUtil.translate(s.path, e)).flat()));
        if (!boundingBox) return;

        let drawingArea = Size.ICON_LARGE - GROUP_PADDING;
        let scale = drawingArea / Math.max(boundingBox.height, boundingBox.width);
        let offsetX = group.structX + GROUP_PADDING / 2 + (drawingArea - scale * boundingBox.width) / 2;
        let offsetY = group.structY + GROUP_PADDING / 2 + (drawingArea - scale * boundingBox.height) / 2;
        let clipBox = { x: group.structX, y: group.structY, height: Size.ICON_LARGE, width: Size.ICON_LARGE };

        group.elements.forEach(element => {
            let elementOffset = MathUtil.subtract(element, boundingBox);
            element.strokes.forEach(stroke => {
                mDrawingUtil.drawStroke(stroke.path,
                    offsetX + elementOffset.x * scale, offsetY + elementOffset.y * scale,
                    scale, stroke.color, stroke.size, clipBox)
            });
        });

        let pos;
        if (group.parentId) {
            code = getCode(group.id, TARGET_LINK_POSITION)
            pos = getChannelNodePosition(ChannelTypes.POSITION);
            mDrawingUtil.drawCircle(pos.x + group.structX, pos.y + group.structY, Size.NODE_TINY / 2, "P", code)
        }

        code = getCode(group.id, TARGET_LINK_ORIENTATION)
        pos = getChannelNodePosition(ChannelTypes.ORIENTATION);
        mDrawingUtil.drawCircle(pos.x + group.structX, pos.y + group.structY, Size.NODE_TINY / 2, "O", code)

        code = getCode(group.id, TARGET_LINK_FORM)
        pos = getChannelNodePosition(ChannelTypes.FORM);
        mDrawingUtil.drawCircle(pos.x + group.structX, pos.y + group.structY, Size.NODE_TINY / 2, "F", code)

        code = getCode(group.id, TARGET_LINK_NUMBER)
        pos = getChannelNodePosition(ChannelTypes.NUMBER);
        mDrawingUtil.drawCircle(pos.x + group.structX, pos.y + group.structY, Size.NODE_TINY / 2, "N", code)
    }

    function drawMapping(mapping, group, dimention) {
        let groupConnectorPoint = MathUtil.add(getChannelNodePosition(mapping.channel), { x: group.structX, y: group.structY });
        let dimentionConnectorPoint = { x: dimention.structX, y: dimention.structY + Size.ICON_LARGE * 0.25 * 0.5 };
        let midPoint;
        if (mapping.channel == ChannelTypes.POSITION) {
            midPoint = mDrawingUtil.drawConnector(null, groupConnectorPoint, null, dimentionConnectorPoint);
        } else {
            midPoint = mDrawingUtil.drawConnector(null, null, groupConnectorPoint, dimentionConnectorPoint);
        }
        mDrawingUtil.drawCircle(midPoint.x, midPoint.y, Size.NODE_TINY / 2, "M");
    }

    function drawDimention(dimention) {
        let code = null;
        if (mInteraction) {

        } else {
            code = getCode(dimention.id, TARGET_DIMENTION);
        }

        let dataStr = dimention.type == DimentionTypes.CONTINUOUS ? dimention.range : "[" + dimention.levels.length + "]";
        let lines = [
            dimention.name,
            "[" + dimention.type + "] " + dataStr,
        ];

        mDrawingUtil.drawTextContainerRect(dimention.structX, dimention.structY, Size.ICON_LARGE, Size.ICON_LARGE * 0.25, lines, code);
    }

    function drawInterface() {
        mDrawingUtil.resetInterface(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);
        if (mHighlightObjectIds) {
            mHighlightObjectIds.forEach(id => {
                let isGroup = IdUtil.isType(id, Data.Group);
                let o = isGroup ? mModel.getGroup(id) : mModel.getDimention(id);
                mDrawingUtil.highlightContainerRect(o.structX, o.structY, Size.ICON_LARGE, Size.ICON_LARGE * (isGroup ? 1 : 0.25));
            })
        }
    }

    function screenToModelCoords(screenCoords) {
        let boundingBox = mInterfaceCanvas.node().getBoundingClientRect();
        if (ValUtil.checkConvertionState(screenCoords, boundingBox, mZoomTransform)) {
            return {
                x: (screenCoords.x - boundingBox.x - mZoomTransform.x) / mZoomTransform.k,
                y: (screenCoords.y - boundingBox.y - mZoomTransform.y) / mZoomTransform.k
            };
        } else {
            return { x: 0, y: 0 };
        }
    }

    function modelToScreenCoords(modelCoords) {
        let boundingBox = mInterfaceCanvas.node().getBoundingClientRect();
        if (ValUtil.checkConvertionState(screenCoords, boundingBox, mZoomTransform)) {
            return {
                x: (modelCoords.x * mZoomTransform.k) + boundingBox.x + mZoomTransform.x,
                y: (modelCoords.y * mZoomTransform.k) + boundingBox.y + mZoomTransform.y
            };
        } else {
            return { x: 0, y: 0 };
        }
    }

    function getInteractionTarget(screenCoords) {
        let boundingBox = mInteractionCanvas.node().getBoundingClientRect();
        let ctx = mInteractionCanvas.node().getContext('2d');
        let p = ctx.getImageData(screenCoords.x - boundingBox.x, screenCoords.y - boundingBox.y, 1, 1).data;
        let hex = DataUtil.rgbToHex(p[0], p[1], p[2]);
        if (mInteractionLookup[hex]) {
            return mInteractionLookup[hex];
        } else {
            return null;
        }
    }

    function getCode(itemId, type) {
        if (mReverseInteractionLookup[itemId + "_" + type]) return mReverseInteractionLookup[itemId + "_" + type];
        else {
            let code = DataUtil.numToColor(mColorIndex++);
            mInteractionLookup[code] = { id: itemId, type };
            mReverseInteractionLookup[itemId + "_" + type] = code;
            return code;
        }
    }

    function getChannelNodePosition(channelType) {
        if (channelType == ChannelTypes.POSITION) {
            return { x: Size.ICON_LARGE / 2, y: 0 };
        } else if (channelType == ChannelTypes.ORIENTATION) {
            return { x: Size.ICON_LARGE, y: Size.ICON_LARGE * 0.25 };
        } else if (channelType == ChannelTypes.FORM) {
            return { x: Size.ICON_LARGE, y: Size.ICON_LARGE * 0.5 };
        } else if (channelType == ChannelTypes.NUMBER) {
            return { x: Size.ICON_LARGE, y: Size.ICON_LARGE * 0.75 };
        }
    }

    return {
        onModelUpdate,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onLongPress,
        onResize,
        highlight,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
        setDimentionCreationCallback: (func) => mDimentionCreationCallback = func,
        setMoveObjectsCallback: (func) => mMoveObjectsCallback = func,
        setLinkCallback: (func) => mLinkCallback = func,
    }
}
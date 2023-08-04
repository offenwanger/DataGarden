
function StructViewController() {
    const DRAG_MOVE = "moveDrag";
    const DRAG_SELECT = "selectDrag"

    const TARGET_LINK_POSITION = 'positionLinkTarget';
    const TARGET_LINK_ORIENTATION = 'orientationLinkTarget';
    const TARGET_LINK_FORM = 'formLinkTarget';
    const TARGET_LINK_NUMBER = 'numberLinkTarget';
    const TARGET_GROUP = 'groupTarget';
    const TARGET_DIMENTION = 'dimentionTarget';

    let mCanvas = d3.select('#struct-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#struct-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#struct-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mHighlightCallback = () => { };
    let mSelectionCallback = () => { };
    let mDimentionCreationCallback = () => { };
    let mMoveObjectsCallback = () => { };
    let mLinkCallback = () => { };
    let mHighlightObjectIds = null;


    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 1;
    let mTargetIncrease = 5;

    let mZoomTransform = d3.zoomIdentity;

    let mModel = new DataModel();
    let mInteraction;
    let mSelectedObjectIds = null;

    function onModelUpdate(model) {
        mModel = model;
        draw();
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
                drawInteraction();
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

        drawInteraction();
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
        let ctx = mCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));
        ctx.save();

        ctx.translate(mZoomTransform.x, mZoomTransform.y)
        ctx.scale(mZoomTransform.k, mZoomTransform.k)

        mModel.getGroups().filter(g => g.parentId).forEach(g => {
            let parent = mModel.getGroup(g.parentId);
            if (!parent) { console.error("Bad state, parent not found!"); return; }
            drawParentConnector(ctx, g, parent);
        })

        mModel.getMappings().forEach(mapping => {
            drawMapping(ctx, mapping, mModel.getGroup(mapping.groupId), mModel.getDimention(mapping.dimentionId));
        })

        mModel.getGroups().forEach(g => {
            drawGroup(ctx, g);
        })

        mModel.getDimentions().forEach(d => {
            drawDimention(ctx, d);
        })

        ctx.restore();

        drawInteraction();
    }

    function drawGroup(ctx, group) {
        ctx.save(); {
            let boundingBox = PathUtil.getBoundingBox(group.elements.map(e => e.strokes.map(s => PathUtil.translate(s.path, e)).flat()));
            if (!boundingBox) return;
            ctx.translate(group.structX, group.structY);

            ctx.save(); {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.rect(0, 0, Size.ICON_LARGE, Size.ICON_LARGE);
                ctx.stroke();

                ctx.shadowColor = "black";
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.shadowBlur = 3;
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, Size.ICON_LARGE, Size.ICON_LARGE);
            } ctx.restore();

            ctx.save(); {
                let miniScale = (Size.ICON_LARGE - 10) / Math.max(boundingBox.height, boundingBox.width);
                ctx.beginPath();
                ctx.rect(0, 0, Size.ICON_LARGE, Size.ICON_LARGE);
                ctx.clip();
                ctx.translate((Size.ICON_LARGE - (boundingBox.width * miniScale)) / 2, (Size.ICON_LARGE - (boundingBox.height * miniScale)) / 2)
                ctx.scale(miniScale, miniScale);

                group.elements.forEach(elem => {
                    ctx.save();
                    let offset = MathUtil.subtract(elem, boundingBox);
                    ctx.translate(offset.x, offset.y)

                    elem.strokes.forEach(stroke => {
                        ctx.save();
                        ctx.strokeStyle = stroke.color;
                        ctx.lineWidth = stroke.size;
                        ctx.beginPath();
                        ctx.moveTo(stroke.path[0].x - 1, stroke.path[0].y - 1);
                        stroke.path.forEach(p => ctx.lineTo(p.x, p.y));
                        ctx.stroke();
                        ctx.restore();
                    });
                    ctx.restore();
                });

            } ctx.restore();

            ctx.save(); {
                ctx.strokeStyle = 'black';
                ctx.fillStyle = "white";
                ctx.lineWidth = 1;
                let posPos;
                if (group.parentId) {
                    ctx.beginPath();
                    posPos = getChannelNodePosition(ChannelTypes.POSITION);
                    ctx.arc(posPos.x, posPos.y, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.beginPath();
                let orPos = getChannelNodePosition(ChannelTypes.ORIENTATION)
                ctx.arc(orPos.x, orPos.y, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                let formPos = getChannelNodePosition(ChannelTypes.FORM)
                ctx.arc(formPos.x, formPos.y, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                let numPos = getChannelNodePosition(ChannelTypes.NUMBER)
                ctx.arc(numPos.x, numPos.y, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "black";
                let fontSize = (Size.NODE_TINY * 0.75);
                ctx.font = fontSize + "px Verdana";
                let horizontalTextOffset = -fontSize * 0.4;
                let verticalTextOffset = fontSize / 2 - 1;
                if (group.parentId) ctx.fillText("P", posPos.x + horizontalTextOffset, posPos.y + verticalTextOffset);
                ctx.fillText("O", orPos.x + horizontalTextOffset, orPos.y + verticalTextOffset);
                ctx.fillText("F", formPos.x + horizontalTextOffset, formPos.y + verticalTextOffset);
                ctx.fillText("N", numPos.x + horizontalTextOffset, numPos.y + verticalTextOffset);

            } ctx.restore();

        } ctx.restore();
    }

    function drawParentConnector(ctx, group, parent) {
        ctx.save(); {
            let groupConnectorPoint = { x: group.structX + Size.ICON_LARGE / 2, y: group.structY };
            let parentConnectorPoint = { x: parent.structX + Size.ICON_LARGE / 2, y: parent.structY + Size.ICON_LARGE };

            let path;
            if (parentConnectorPoint.y > groupConnectorPoint.y) {
                path = [
                    [groupConnectorPoint.x, groupConnectorPoint.y],
                    [groupConnectorPoint.x, groupConnectorPoint.y - 5],
                    [(parentConnectorPoint.x + groupConnectorPoint.x) / 2, groupConnectorPoint.y - 5],
                    [(parentConnectorPoint.x + groupConnectorPoint.x) / 2, parentConnectorPoint.y + 5],
                    [parentConnectorPoint.x, parentConnectorPoint.y + 5],
                    [parentConnectorPoint.x, parentConnectorPoint.y],
                ]
            } else {
                path = [
                    [groupConnectorPoint.x, groupConnectorPoint.y],
                    [groupConnectorPoint.x, (groupConnectorPoint.y + parentConnectorPoint.y) / 2],
                    [parentConnectorPoint.x, (groupConnectorPoint.y + parentConnectorPoint.y) / 2],
                    [parentConnectorPoint.x, parentConnectorPoint.y],
                ]
            }
            ctx.moveTo(path[0][0], path[0][1]);
            ctx.beginPath();
            path.forEach(p => ctx.lineTo(p[0], p[1]));
            ctx.stroke();

        } ctx.restore();
    }

    function drawMapping(ctx, mapping, group, dimention) {
        ctx.save(); {
            let groupConnectorPoint = MathUtil.add(getChannelNodePosition(mapping.channel), { x: group.structX, y: group.structY });
            let dimentionConnectorPoint = { x: dimention.structX, y: dimention.structY + Size.ICON_LARGE * 0.25 * 0.5 };

            let path = [];
            if (mapping.channel == ChannelTypes.POSITION) {
                path.push({ x: groupConnectorPoint.x, y: groupConnectorPoint.y });
                groupConnectorPoint.y = groupConnectorPoint.y - 5;
            }
            if (dimentionConnectorPoint.x < groupConnectorPoint.x) {
                path.push(
                    { x: groupConnectorPoint.x, y: groupConnectorPoint.y },
                    { x: groupConnectorPoint.x + 10, y: groupConnectorPoint.y },
                    { x: groupConnectorPoint.x + 10, y: (dimentionConnectorPoint.y + groupConnectorPoint.y) / 2 },
                    { x: dimentionConnectorPoint.x - 5, y: (dimentionConnectorPoint.y + groupConnectorPoint.y) / 2 },
                    { x: dimentionConnectorPoint.x - 5, y: dimentionConnectorPoint.y },
                    { x: dimentionConnectorPoint.x, y: dimentionConnectorPoint.y },
                )
            } else {
                path.push(
                    { x: groupConnectorPoint.x, y: groupConnectorPoint.y },
                    { x: (groupConnectorPoint.x + dimentionConnectorPoint.x) / 2, y: groupConnectorPoint.y },
                    { x: (groupConnectorPoint.x + dimentionConnectorPoint.x) / 2, y: dimentionConnectorPoint.y },
                    { x: dimentionConnectorPoint.x, y: dimentionConnectorPoint.y },
                )
            }
            ctx.moveTo(path[0].x, path[0].y);
            ctx.beginPath();
            path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();

            // draw the M marker
            ctx.beginPath();
            let midPoint = {
                y: (dimentionConnectorPoint.y + groupConnectorPoint.y) / 2,
                x: (groupConnectorPoint.x + dimentionConnectorPoint.x) / 2
            }
            ctx.arc(midPoint.x, midPoint.y, Size.NODE_TINY / 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "white";
            let fontSize = (Size.NODE_TINY * 0.75);
            ctx.font = fontSize + "px Verdana";
            let horizontalTextOffset = -fontSize * 0.4;
            let verticalTextOffset = fontSize / 2 - 1;
            ctx.fillText("M", midPoint.x + horizontalTextOffset, midPoint.y + verticalTextOffset);

        } ctx.restore();
    }

    function drawDimention(ctx, dimention) {
        ctx.save(); {
            ctx.translate(dimention.structX, dimention.structY);

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(0, 0, Size.ICON_LARGE, Size.ICON_LARGE * 0.25);
            ctx.stroke();

            ctx.save(); {
                ctx.shadowColor = "black";
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.shadowBlur = 3;
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, Size.ICON_LARGE, Size.ICON_LARGE * 0.25);
            } ctx.restore();

            ctx.fillStyle = "black";
            let fontSize = Size.ICON_LARGE * 0.25 * 0.5 - 4;
            ctx.font = fontSize + "px Verdana";
            ctx.fillText(dimention.name, 10, fontSize + 2);
            let dataStr = dimention.type == DimentionTypes.CONTINUOUS ? dimention.range : "[" + dimention.levels.length + "]";
            ctx.fillText("[" + dimention.type + "] " + dataStr, 10, fontSize * 2 + 3);

        } ctx.restore();
    }

    function drawInteraction() {
        let ctx = mInteractionCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));

        ctx.save();
        ctx.translate(mZoomTransform.x, mZoomTransform.y)
        ctx.scale(mZoomTransform.k, mZoomTransform.k)

        if (mInteraction && mInteraction.type == DRAG_MOVE) {
            mModel.getGroups().filter(g => !mSelectedObjectIds.includes(g.id)).forEach(g => {
                ctx.save();
                ctx.translate(g.structX, g.structY);
                ctx.fillStyle = getCode(g.id, TARGET_LINK_POSITION);
                if (g.parentId) {
                    ctx.beginPath();
                    let posPos = getChannelNodePosition(ChannelTypes.POSITION);
                    ctx.arc(posPos.x, posPos.y, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }

                ctx.fillStyle = getCode(g.id, TARGET_LINK_ORIENTATION);
                ctx.beginPath();
                let orPos = getChannelNodePosition(ChannelTypes.ORIENTATION)
                ctx.arc(orPos.x, orPos.y, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = getCode(g.id, TARGET_LINK_FORM);
                ctx.beginPath();
                let formPos = getChannelNodePosition(ChannelTypes.FORM)
                ctx.arc(formPos.x, formPos.y, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = getCode(g.id, TARGET_LINK_NUMBER);
                ctx.beginPath();
                let numPos = getChannelNodePosition(ChannelTypes.NUMBER)
                ctx.arc(numPos.x, numPos.y, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            })

        } else {
            mModel.getGroups().forEach(g => {
                let code = getCode(g.id, TARGET_GROUP);
                ctx.save();
                ctx.translate(g.structX, g.structY);
                ctx.fillStyle = code;
                ctx.fillRect(0, 0, Size.ICON_LARGE, Size.ICON_LARGE);
                ctx.restore();
            })

            mModel.getDimentions().forEach(d => {
                let code = getCode(d.id, TARGET_DIMENTION);
                ctx.save();
                ctx.translate(d.structX, d.structY);
                ctx.fillStyle = code;
                ctx.fillRect(0, 0, Size.ICON_LARGE, Size.ICON_LARGE * 0.25);
                ctx.restore();
            })
        }

        ctx.restore();
    }

    function drawInterface() {
        let ctx = mInterfaceCanvas.node().getContext("2d");
        ctx.clearRect(0, 0, mInterfaceCanvas.attr("width"), mInterfaceCanvas.attr("height"));

        if (mHighlightObjectIds) {
            ctx.save();
            ctx.translate(mZoomTransform.x, mZoomTransform.y)
            ctx.scale(mZoomTransform.k, mZoomTransform.k)
            mHighlightObjectIds.forEach(id => {
                let isGroup = IdUtil.isType(id, Data.Group);
                let o = isGroup ? mModel.getGroup(id) : mModel.getDimention(id);
                ctx.save();
                ctx.translate(o.structX, o.structY);
                ctx.strokeStyle = "red";
                ctx.beginPath();
                ctx.rect(0, 0, Size.ICON_LARGE, Size.ICON_LARGE * (isGroup ? 1 : 0.25));
                ctx.stroke();
                ctx.restore();
            })
            ctx.restore();
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
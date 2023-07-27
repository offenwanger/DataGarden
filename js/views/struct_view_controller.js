
function StructViewController() {
    const DRAG_MOVE = "moveDrag";
    const DRAG_SELECT = "selectDrag"


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
                if (!mSelectedObjectIds || !mSelectedObjectIds.find(id => id == target)) {
                    // item not in selection
                    mSelectedObjectIds = [target];
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
                    let targetId = getInteractionTarget(screenCoords);
                    if (targetId) {
                        mHighlightObjectIds = [targetId];
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
                    // do drop targetStuff
                } else {
                    mMoveObjectsCallback(mSelectedObjectIds, moveDiff)
                }
            } else {
                console.error("Subselect!")
            }
        }

        if (interaction && (toolState == Buttons.ZOOM_BUTTON || toolState == Buttons.PANNING_BUTTON)) {
            drawInteraction();
        }

        mInteraction = false;
    }

    function onResize(height, width) {
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

        mModel.getGroups().forEach(g => {
            drawIcon(ctx, g);
        })

        mModel.getDimentions().forEach(d => {
            drawDimention(ctx, d);
        })

        ctx.restore();

        drawInteraction();
    }

    function drawIcon(ctx, group) {
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
                if (group.parentId) {
                    ctx.beginPath();
                    ctx.arc(Size.ICON_LARGE / 2, 0, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(Size.ICON_LARGE, Size.ICON_LARGE * 0.25, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(Size.ICON_LARGE, Size.ICON_LARGE * 0.5, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(Size.ICON_LARGE, Size.ICON_LARGE * 0.75, Size.NODE_TINY / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "black";
                let fontSize = (Size.NODE_TINY * 0.75);
                ctx.font = fontSize + "px Verdana";
                let horizontalTextOffset = -fontSize * 0.4;
                let verticalTextOffset = fontSize / 2 - 1;
                if (group.parentId) ctx.fillText("P", Size.ICON_LARGE / 2 + horizontalTextOffset, verticalTextOffset);
                ctx.fillText("O", Size.ICON_LARGE + horizontalTextOffset, Size.ICON_LARGE * 0.25 + verticalTextOffset);
                ctx.fillText("F", Size.ICON_LARGE + horizontalTextOffset, Size.ICON_LARGE * 0.5 + verticalTextOffset);
                ctx.fillText("N", Size.ICON_LARGE + horizontalTextOffset, Size.ICON_LARGE * 0.75 + verticalTextOffset);

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

            // draw the tails
            ctx.moveTo(path[0][0], path[0][1]);
            ctx.beginPath();
            path.forEach(p => ctx.lineTo(p[0], p[1]));
            ctx.stroke();

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
            ctx.fillText(dimention.name, 5, fontSize + 2);
            let dataStr = dimention.type == DimentionTypes.CONTINUOUS ? dimention.range : "[" + dimention.levels.length + "]";
            ctx.fillText("[" + dimention.type + "] " + dataStr, 5, fontSize * 2 + 3);

        } ctx.restore();
    }

    function drawInteraction() {
        let ctx = mInteractionCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));

        ctx.save();
        ctx.translate(mZoomTransform.x, mZoomTransform.y)
        ctx.scale(mZoomTransform.k, mZoomTransform.k)

        if (mInteraction && mInteraction.type == DRAG_MOVE) {

        } else {
            mModel.getGroups().forEach(g => {
                let code = getCode(g.id);
                ctx.save();
                ctx.translate(g.structX, g.structY);
                ctx.fillStyle = code;
                ctx.fillRect(0, 0, Size.ICON_LARGE, Size.ICON_LARGE);
                ctx.restore();
            })

            mModel.getDimentions().forEach(d => {
                let code = getCode(d.id);
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

    function getCode(itemId) {
        if (mReverseInteractionLookup[itemId]) return mReverseInteractionLookup[itemId];
        else {
            let code = DataUtil.numToColor(mColorIndex++);
            mInteractionLookup[code] = itemId;
            mReverseInteractionLookup[itemId] = code;
            return code;
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
    }
}
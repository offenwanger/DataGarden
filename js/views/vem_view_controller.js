
function VemViewController() {
    const DRAG_MOVE = "moveDrag";
    const DRAG_SELECT = "selectDrag"

    const TARGET_PARENT = 'parentTarget';
    const TARGET_MERGE = 'mergeTarget';
    const TARGET_ELEMENT = 'elementTarget';

    const ICON_SIZE = 64;

    let mCanvas = d3.select('#vem-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#vem-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#vem-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mHighlightCallback = () => { };
    let mSelectionCallback = () => { };
    let mMoveElementCallback = () => { };
    let mMergeElementCallback = () => { };
    let mParentElementCallback = () => { };
    let mHighlightElementIds = null;
    let mSelectedElements = null;

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 1;
    let mTargetIncrease = 5;

    let mZoomTransform = d3.zoomIdentity;

    let mModel = new DataModel();
    let mInteraction = null;
    let mStartPos;

    function onModelUpdate(model) {
        mModel = model;
        let elementIds = mModel.getElements().map(e => e.id);
        if (mHighlightElementIds) {
            mHighlightElementIds = mHighlightElementIds.filter(id => elementIds.includes(id));
            if (mHighlightElementIds.length == 0) mHighlightElementIds = null;
        }

        if (mSelectedElements) {
            mSelectedElements = mSelectedElements.filter(id => elementIds.includes(id));
            if (mSelectedElements.length == 0) mSelectedElements = null;
        }

        draw();
        drawInteraction();
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
            mInteraction = {
                start: screenToModelCoords(screenCoords),
                startTime: Date.now(),
            }

            let target = getInteractionTarget(screenCoords);
            if (target) {
                if (!mSelectedElements || !mSelectedElements.find(e => e.id == target.id)) {
                    // element not in selection
                    mSelectedElements = [target.id];
                    mSelectionCallback(mSelectedElements);
                }
                mInteraction.type = DRAG_MOVE;
                mInteraction.originalModel = mModel.clone();
                drawInteraction();
            } else {
                mSelectedElements = null;
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
            mZoomTransform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
            draw();
            drawInterface();
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            if (mInteraction) {
                let moveDiff = MathUtil.subtract(screenToModelCoords(screenCoords), mInteraction.start);
                if (mInteraction.type == DRAG_MOVE) {
                    mModel = mInteraction.originalModel.clone();
                    let elements = mModel.getElements().filter(e => mSelectedElements.includes(e.id));
                    elements.forEach(e => {
                        e.vemX += moveDiff.x;
                        e.vemY += moveDiff.y;
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
                        mHighlightElementIds = [target.id];
                        mHighlightCallback(mHighlightElementIds);
                    } else {
                        mHighlightElementIds = null;
                        mHighlightCallback(null);
                    }
                }
                drawInterface();
            }
        }

        if (mHighlightElementIds && toolState != Buttons.SELECTION_BUTTON) {
            mHighlightElementIds = null;
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
                    if (dropTarget.type == TARGET_MERGE) {
                        mMergeElementCallback(mSelectedElements, dropTarget.id);
                    } else if (dropTarget.type == TARGET_PARENT) {
                        mParentElementCallback(mSelectedElements, dropTarget.id);
                    } else {
                        console.error("Bad State", dropTarget);
                    }
                } else {
                    mMoveElementCallback(mSelectedElements, moveDiff)
                }
            } else {
                console.log("Subselect!")
            }
        }

        if (interaction && (toolState == Buttons.ZOOM_BUTTON || toolState == Buttons.PANNING_BUTTON)) {
            drawInteraction();
        }
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
        drawInteraction();
        drawInterface();
    }

    function highlight(ids) {
        if (!ids || (Array.isArray(ids) && ids.length == 0)) {
            mHighlightElementIds = null;
        } else {
            mHighlightElementIds = ids.filter(id => IdUtil.isType(id, Data.Element));
            mHighlightElementIds.push(...ids.filter(id => IdUtil.isType(id, Data.Group)).map(groupId => mModel.getGroup(groupId).elements).flat());
            mHighlightElementIds.push(...ids.filter(id => IdUtil.isType(id, Data.Stroke)).map(sId => mModel.getElementForStroke(sId)));
            mHighlightElementIds = mHighlightElementIds.filter((elementId, index, self) => self.findIndex(id => id == elementId) == index);
        }
        drawInterface();
    }

    function draw() {
        let ctx = mCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));
        ctx.save();

        ctx.translate(mZoomTransform.x, mZoomTransform.y)
        ctx.scale(mZoomTransform.k, mZoomTransform.k)

        let elements = mModel.getElements()
        elements.filter(e => e.parentId)
            .forEach(elem => drawParentConnector(ctx, elem, mModel.getElement(elem.parentId)))
        elements.forEach(elem => drawIcon(ctx, elem))

        ctx.restore();
    }

    function drawIcon(ctx, elem) {
        let boundingBox = DataUtil.getBoundingBox(elem);
        ctx.save();
        ctx.translate(elem.vemX, elem.vemY);

        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.rect(0, 0, ICON_SIZE, ICON_SIZE);
        ctx.stroke();

        ctx.shadowColor = "black";
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 3;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
        ctx.restore();

        let miniScale = (ICON_SIZE - 10) / Math.max(boundingBox.height, boundingBox.width);
        ctx.beginPath();
        ctx.rect(0, 0, ICON_SIZE, ICON_SIZE);
        ctx.clip();
        ctx.translate((ICON_SIZE - (boundingBox.width * miniScale)) / 2, (ICON_SIZE - (boundingBox.height * miniScale)) / 2)
        ctx.scale(miniScale, miniScale);

        elem.strokes.forEach(stroke => {
            ctx.save();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.moveTo(stroke.path[0].x, stroke.path[0].y);
            ctx.beginPath();
            stroke.path.forEach(p => {
                ctx.lineTo(p.x, p.y);
            });

            ctx.stroke();
            ctx.restore();
        })

        ctx.restore();
    }

    function drawParentConnector(ctx, element, parent) {
        ctx.save();

        let elementConnectorPoint = { x: element.vemX + ICON_SIZE / 2, y: element.vemY };
        let parentConnectorPoint = { x: parent.vemX + ICON_SIZE / 2, y: parent.vemY + ICON_SIZE };

        let path;
        if (parentConnectorPoint.y > elementConnectorPoint.y) {
            path = [
                [elementConnectorPoint.x, elementConnectorPoint.y],
                [elementConnectorPoint.x, elementConnectorPoint.y - 5],
                [(parentConnectorPoint.x + elementConnectorPoint.x) / 2, elementConnectorPoint.y - 5],
                [(parentConnectorPoint.x + elementConnectorPoint.x) / 2, parentConnectorPoint.y + 5],
                [parentConnectorPoint.x, parentConnectorPoint.y + 5],
                [parentConnectorPoint.x, parentConnectorPoint.y],
            ]
        } else {
            path = [
                [elementConnectorPoint.x, elementConnectorPoint.y],
                [elementConnectorPoint.x, (elementConnectorPoint.y + parentConnectorPoint.y) / 2],
                [parentConnectorPoint.x, (elementConnectorPoint.y + parentConnectorPoint.y) / 2],
                [parentConnectorPoint.x, parentConnectorPoint.y],
            ]
        }

        // draw the tails
        ctx.moveTo(path[0][0], path[0][1]);
        ctx.beginPath();
        path.forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.stroke();

        ctx.restore();
    }

    function drawInteraction() {
        let ctx = mInteractionCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));

        ctx.save();
        ctx.translate(mZoomTransform.x, mZoomTransform.y)
        ctx.scale(mZoomTransform.k, mZoomTransform.k)

        if (mInteraction) {
            if (mInteraction.type == DRAG_MOVE) {
                mModel.getElements().forEach(e => {
                    if (!mSelectedElements.includes(e.id)) {
                        ctx.save();
                        ctx.translate(e.vemX, e.vemY);
                        ctx.fillStyle = getCode(e.id, TARGET_MERGE);
                        ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE * 0.75);

                        ctx.fillStyle = getCode(e.id, TARGET_PARENT);
                        ctx.fillRect(0, ICON_SIZE * 0.75, ICON_SIZE, ICON_SIZE);

                        ctx.restore();
                    }
                })
            }
        } else {
            mModel.getElements().forEach(e => {
                let code = getCode(e.id, TARGET_ELEMENT);
                ctx.save();
                ctx.translate(e.vemX, e.vemY);
                ctx.fillStyle = code;
                ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
                ctx.restore();
            })
        }

        ctx.restore();
    }

    function drawInterface() {
        let ctx = mInterfaceCanvas.node().getContext("2d");
        ctx.clearRect(0, 0, mInterfaceCanvas.attr("width"), mInterfaceCanvas.attr("height"));

        if (mHighlightElementIds) {
            ctx.save();
            ctx.translate(mZoomTransform.x, mZoomTransform.y)
            ctx.scale(mZoomTransform.k, mZoomTransform.k)
            mHighlightElementIds.forEach(eId => {
                let e = mModel.getElement(eId)
                ctx.save();
                ctx.translate(e.vemX, e.vemY);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "red";
                ctx.beginPath();
                ctx.rect(0, 0, ICON_SIZE, ICON_SIZE);
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
        if (ValUtil.checkConvertionState(screenCoords, boundingBox, zoomPan)) {
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

    return {
        onModelUpdate,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onResize,
        highlight,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
        setMoveElementCallback: (func) => mMoveElementCallback = func,
        setMergeElementCallback: (func) => mMergeElementCallback = func,
        setParentElementCallback: (func) => mParentElementCallback = func,
    }
}

function VemViewController() {
    const DRAG_MOVE = "moveDrag";
    const DRAG_SELECT = "selectDrag"

    const TARGET_PARENT = 'parentTarget';
    const TARGET_MERGE = 'mergeTarget';
    const TARGET_ELEMENT = 'elementTarget';

    const ELEMENT_PADDING = 10;

    let mCanvas = d3.select('#vem-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#vem-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#vem-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);
    let mDrawingUtil = new DrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d"),
        mInterfaceCanvas.node().getContext("2d"),
    );

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

    let mZoomTransform = d3.zoomIdentity;

    let mModel = new DataModel();
    let mInteraction = null;

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
                start: screenToModelCoords(screenCoords)
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
                draw();
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
                console.error("Subselect!")
            }
        }

        if (interaction && (toolState == Buttons.ZOOM_BUTTON || toolState == Buttons.PANNING_BUTTON)) {
            draw();
        }
    }

    function onResize(height, width) {
        d3.select("#vem-view")
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

    function highlight(ids) {
        if (!ids || (Array.isArray(ids) && ids.length == 0)) {
            mHighlightElementIds = null;
        } else {
            mHighlightElementIds = ids.filter(id => IdUtil.isType(id, Data.Element));
            mHighlightElementIds.push(...ids.filter(id => IdUtil.isType(id, Data.Group)).map(groupId => mModel.getGroup(groupId).elements.map(e => e.id)).flat());
            mHighlightElementIds.push(...ids.filter(id => IdUtil.isType(id, Data.Stroke)).map(sId => mModel.getElementForStroke(sId).id));
            mHighlightElementIds = mHighlightElementIds.filter((elementId, index, self) => self.findIndex(id => id == elementId) == index);
        }
        drawInterface();
    }

    function draw() {
        mDrawingUtil.reset(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);

        let elements = mModel.getElements()
        elements.filter(e => e.parentId).forEach(element => {
            let parent = mModel.getElement(element.parentId);
            if (!parent) { console.error("Bad state, parent not found! ", element.parentId); return; }
            let elementConnectorPoint = { x: element.vemX + Size.ICON_MEDIUM / 2, y: element.vemY };
            let parentConnectorPoint = { x: parent.vemX + Size.ICON_MEDIUM / 2, y: parent.vemY + Size.ICON_MEDIUM };
            mDrawingUtil.drawConnector(parentConnectorPoint, elementConnectorPoint, null, null);
        })

        elements.forEach(element => {
            let code = null;
            let code2 = null;
            if (mInteraction) {
                if (mInteraction.type == DRAG_MOVE && !mSelectedElements.includes(element.id)) {
                    code = getCode(element.id, TARGET_MERGE);
                    code2 = getCode(element.id, TARGET_PARENT);
                }
            } else {
                code = getCode(element.id, TARGET_ELEMENT);
            }

            mDrawingUtil.drawContainerRect(element.vemX, element.vemY, Size.ICON_MEDIUM, Size.ICON_MEDIUM, code);
            // overwrite the bottom half with a split interaction
            if (code2) mDrawingUtil.drawContainerRectSplitInteraction(
                element.vemX, element.vemY, Size.ICON_MEDIUM, Size.ICON_MEDIUM, 0.25, code2)

            let boundingBox = DataUtil.getBoundingBox(element);
            let drawingArea = Size.ICON_MEDIUM - ELEMENT_PADDING;
            let scale = drawingArea / Math.max(boundingBox.height, boundingBox.width);
            let offsetX = element.vemX + 5 + (drawingArea - scale * boundingBox.width) / 2;
            let offsetY = element.vemY + 5 + (drawingArea - scale * boundingBox.height) / 2;
            let clipBox = { x: element.vemX, y: element.vemY, height: Size.ICON_MEDIUM, width: Size.ICON_MEDIUM };

            element.strokes.forEach(stroke => {
                mDrawingUtil.drawStroke(stroke.path, offsetX, offsetY, scale, stroke.color, stroke.size, clipBox)
            });
        })
    }

    // interface is separate so we can redraw highlights without redrawing everything
    function drawInterface() {
        mDrawingUtil.resetInterface(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);
        if (mHighlightElementIds) {
            mHighlightElementIds.forEach(eId => {
                let e = mModel.getElement(eId)
                mDrawingUtil.highlightContainerRect(e.vemX, e.vemY, Size.ICON_MEDIUM, Size.ICON_MEDIUM);
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
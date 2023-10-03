
function StrokeViewController() {
    const DRAWING = 'drawing';
    const SELECTING = 'selecting';
    const PANNING = 'panning';
    const ZOOMING = 'zooming';
    const DRAGGING = 'dragging';

    let mCanvas = d3.select('#stroke-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#stroke-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#stroke-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mDrawingUtil = new DrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d"),
        mInterfaceCanvas.node().getContext("2d"),
    );

    let mNewStrokeCallback = () => { };
    let mHighlightCallback = () => { };
    let mSelectionCallback = () => { };

    let mZoomTransform = d3.zoomIdentity;
    let mBrushActive = false;
    let mHighlightIds = [];
    let mShowSpines = null;

    let mBrushOptions = {
        size: 1,
        color: "#000000FF",
        currentStroke: [{ x: 0, y: 0 }]
    }

    let mSelectionLine = [];
    let mSelection = [];

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 1;
    let mTargetIncrease = 5;

    let mModel = new DataModel();
    let mInteracting = false;
    let mStartPos;

    function onModelUpdate(model) {
        mModel = model;
        mHighlightIds = []
        draw();
    }

    function onPointerDown(screenCoords, toolState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect()))
            return false;

        if (toolState == Buttons.PANNING_BUTTON) {
            mStartPos = {
                x: mZoomTransform.x,
                y: mZoomTransform.y,
                scale: mZoomTransform.k,
                screenCoords,
            }
            mInteracting = PANNING;
            return true;
        } else if (toolState == Buttons.ZOOM_BUTTON) {
            let zoomCenter = screenToModelCoords(screenCoords)
            mStartPos = {
                pointerX: zoomCenter.x,
                pointerY: zoomCenter.y,
                transformX: mZoomTransform.x,
                transformY: mZoomTransform.y,
                scale: mZoomTransform.k,
                screenCoords,
            }
            mInteracting = ZOOMING;
            return true;
        } else if (toolState == Buttons.BRUSH_BUTTON) {
            mInteracting = DRAWING;
            mBrushOptions.currentStroke = [screenToModelCoords(screenCoords)];
            return true;
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            let target = getInteractionTarget(screenCoords);
            if (mSelection.includes(target)) {
                mInteracting = DRAGGING;
                console.error("impliment me!")
            } else {
                mInteracting = SELECTING;
                mSelection = [];
            }
            return true;
        } else if (toolState == Buttons.SHIFT_SELECTION_BUTTON) {
            // start select interaction
        }
    }

    function onPointerMove(screenCoords, toolState) {
        if (mInteracting == PANNING) {
            let mouseDist = MathUtil.subtract(screenCoords, mStartPos.screenCoords);
            let translate = MathUtil.add(mStartPos, mouseDist);
            mZoomTransform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mStartPos.scale);
            draw();
            drawInterface();
        } else if (mInteracting == ZOOMING) {
            let mouseDist = screenCoords.y - mStartPos.screenCoords.y;
            let scale = mStartPos.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
            let zoomChange = scale - mStartPos.scale;
            let transformX = -(mStartPos.pointerX * zoomChange) + mStartPos.transformX;
            let transformY = -(mStartPos.pointerY * zoomChange) + mStartPos.transformY;
            mZoomTransform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
            draw();
            drawInterface();
        } else if (mInteracting == DRAWING) {
            mBrushOptions.currentStroke.push(screenToModelCoords(screenCoords));
            drawInterface();
        } else if (mInteracting == SELECTING) {
            mSelectionLine.push(screenToModelCoords(screenCoords));
            drawInterface();
        } else if (mInteracting == DRAGGING) {
            console.error("impliment me!")
        } else if (mInteracting) {
            console.error("Not Handled!", mInteracting);
        } else if (toolState == Buttons.BRUSH_BUTTON) {
            mBrushActive = true;
            mBrushOptions.currentStroke = [screenToModelCoords(screenCoords)];
            drawInterface();
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            if (!ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
                let targetId = getInteractionTarget(screenCoords);
                if (targetId) {
                    let element = mModel.getElementForStroke(targetId);
                    let elements = mModel.getElementDecendants(element.id);
                    mHighlightIds.push(element.id);
                    mHighlightIds = DataUtil.unique(mHighlightIds.concat(elements.map(e => e.id)));
                    mHighlightCallback(mHighlightIds);
                } else {
                    mHighlightIds = [];
                    mHighlightCallback(null);
                }
            }
            drawInterface();

        } else if (toolState == Buttons.VIEW_BUTTON) {
            let targetId = getInteractionTarget(screenCoords);
            if (targetId) {
                let element = mModel.getElementForStroke(targetId);
                let elements = mModel.getElementDecendants(element.id);
                mShowSpines = elements;
                drawInterface();
            } else {
                mShowSpines = null;
                drawInterface();
            }
        }

        if (mBrushActive && toolState != Buttons.BRUSH_BUTTON) {
            mBrushActive = false;
            drawInterface();
        }

        if (mHighlightIds && toolState != Buttons.SELECTION_BUTTON) {
            mHighlightIds = [];
            drawInterface();
        }

        if (mShowSpines && toolState != Buttons.VIEW_BUTTON) {
            mShowSpines = null;
            drawInterface();
        }
    }

    function onPointerUp(screenCoords, toolState) {
        mInteracting = false;
        mStartPos = null;

        if (toolState == Buttons.BRUSH_BUTTON && mBrushOptions.currentStroke.length > 1) {
            mNewStrokeCallback(new Data.Stroke(mBrushOptions.currentStroke, mBrushOptions.size, mBrushOptions.color))
            mBrushOptions.currentStroke = [screenToModelCoords(screenCoords)];
            drawInterface();
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            // are we in a selection interaction
            //      did we move (more than say 5 px)
            //           update the selection, show one big box if anything is selected
            //      did we mouse up on a thing? 
            //           select the thing
            // are we in a moving interaction
            //      did we move more than 5 px?
            //          move the thing
            //      else
            //          did we mouse up on a subthing (child element, etc)
            //              narrow the selection to the subelement
        } else if (toolState == Buttons.SHIFT_SELECTION_BUTTON) {
            // update the selection
        }
    }

    function onResize(height, width) {
        d3.select("#stroke-view")
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
            mHighlightIds = [];
        } else {
            mHighlightIds = ids;
        }
        drawInterface();
    }

    function setColor(color) {
        mBrushOptions.color = color;
    }

    function draw() {
        mDrawingUtil.reset(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);
        mModel.getElements().forEach(elem => {
            elem.strokes.forEach(stroke => {
                mDrawingUtil.drawStroke(stroke.path, stroke.color, stroke.size, getCode(stroke.id))
            })
        })
        drawInterface();
    }

    function drawInterface() {
        mDrawingUtil.resetInterface(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);

        if (mBrushActive) {
            mDrawingUtil.drawInterfaceStroke(mBrushOptions.currentStroke, mBrushOptions.color, mBrushOptions.size)
        }

        mHighlightIds.forEach(id => {
            if (IdUtil.isType(id, Data.Element)) {
                let element = mModel.getElement(id);
                if (!element) { console.error("Invalid element id", id); return; }
                mDrawingUtil.highlightBoundingBox(DataUtil.getBoundingBox(element))
            } else if (IdUtil.isType(id, Data.Stroke)) {
                let stroke = mModel.getStroke(id);
                if (!stroke) { console.error("Invalid stroke id", id); return; }
                mDrawingUtil.highlightBoundingBox(DataUtil.getBoundingBox(stroke));
            } else if (IdUtil.isType(id, Data.Group)) {
                console.error("impliment me!")
            }
        })

        if (mShowSpines) {
            mShowSpines.forEach(element => {
                mDrawingUtil.drawSpine(element.spine)
            });
        }
    }

    function getInteractionTarget(screenCoords) {
        let boundingBox = mInteractionCanvas.node().getBoundingClientRect();
        let ctx = mInteractionCanvas.node().getContext('2d');
        let p = ctx.getImageData(screenCoords.x - boundingBox.x, screenCoords.y - boundingBox.y, 1, 1).data;
        let hex = DataUtil.rgbToHex(p[0], p[1], p[2]);
        if (mInteractionLookup[hex]) return mInteractionLookup[hex];
        else return null;
    }

    function getCode(strokeId) {
        if (mReverseInteractionLookup[strokeId]) return mReverseInteractionLookup[strokeId];
        else {
            let code = DataUtil.numToColor(mColorIndex += 100);
            mInteractionLookup[code] = strokeId;
            mReverseInteractionLookup[strokeId] = code;
            return code;
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

    return {
        onModelUpdate,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onResize,
        setColor,
        highlight,
        setNewStrokeCallback: (func) => mNewStrokeCallback = func,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
    }
}
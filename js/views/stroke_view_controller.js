
function StrokeViewController() {
    let mCanvas = d3.select('#stroke-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#stroke-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#stroke-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mStrokeCallback = () => { };
    let mHighlightCallback = () => { };
    let mSelectionCallback = () => { };

    let mPanZoom = d3.zoom();
    let mBrushActive = false;
    let mHighlightBoundingBoxes = null;

    let mBrushOptions = {
        size: 10,
        color: "#000000FF",
        currentStroke: [{ x: 0, y: 0 }]
    }

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 1;
    let mTargetIncrease = 5;

    let mModel = new DataModel();
    let mInteracting = false;
    let mStartPos;

    function onModelUpdate(model) {
        mModel = model;
        draw();
    }

    function onPointerDown(screenCoords, toolState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect()))
            return false;

        if (toolState == Buttons.PANNING_BUTTON) {
            let zoom = getZoom();
            mStartPos = {
                x: zoom.x,
                y: zoom.y,
                scale: zoom.k,
                screenCoords,
            }

            mInteracting = true;
            return true;
        } else if (toolState == Buttons.ZOOM_BUTTON) {
            mInteracting = true;

            let zoom = getZoom();
            let zoomCenter = screenToModelCoords(screenCoords)

            mStartPos = {
                pointerX: zoomCenter.x,
                pointerY: zoomCenter.y,
                transformX: zoom.x,
                transformY: zoom.y,
                scale: zoom.k,
                screenCoords,
            }

            mInteracting = true;
            return true;
        } else if (toolState == Buttons.BRUSH_BUTTON) {
            mInteracting = true;
            return true;
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            // are we clicking outside our selection
            //      clear the selection
            //      start select interaction
            // are we clicking our selection
            //      start drag interaction
        } else if (toolState == Buttons.SHIFT_SELECTION_BUTTON) {
            // start select interaction
        }
    }

    function onPointerMove(screenCoords, toolState) {
        if (toolState == Buttons.PANNING_BUTTON && mInteracting) {
            let mouseDist = MathUtil.subtract(screenCoords, mStartPos.screenCoords);
            let translate = MathUtil.add(mStartPos, mouseDist);
            let transform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mStartPos.scale);
            mInterfaceCanvas.call(mPanZoom.transform, transform);
            draw();
            drawInterface();
        } else if (toolState == Buttons.ZOOM_BUTTON && mInteracting) {
            let mouseDist = screenCoords.y - mStartPos.screenCoords.y;
            let scale = mStartPos.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
            let zoomChange = scale - mStartPos.scale;
            let transformX = -(mStartPos.pointerX * zoomChange) + mStartPos.transformX;
            let transformY = -(mStartPos.pointerY * zoomChange) + mStartPos.transformY;
            let transform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
            mInterfaceCanvas.call(mPanZoom.transform, transform);
            draw();
            drawInterface();
        } else if (toolState == Buttons.BRUSH_BUTTON) {
            mBrushActive = true;
            if (mInteracting) {
                mBrushOptions.currentStroke.push(screenToModelCoords(screenCoords));
                drawInterface();
            } else {
                mBrushOptions.currentStroke = [screenToModelCoords(screenCoords)];
                drawInterface();
            }
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            if (mInteracting) {
                //  if we are select dragging
                //      look up all things which fall in the box (we require complete coverage)
                //      draw boxes around them
                //  if we are dragging a selection
                //      draw the stashed background
                //      update the offset on all the strokes, draw them. 
            } else {
                if (!ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
                    let targetId = getInteractionTarget(screenCoords);
                    let element = mModel.getElementForStroke(targetId);
                    if (element) {
                        let elements = mModel.getElementDecendants(element.id);
                        mHighlightBoundingBoxes = [DataUtil.getBoundingBox(elements)];
                        mHighlightCallback(elements);
                    } else {
                        mHighlightBoundingBoxes = null;
                        mHighlightCallback(null);
                    }
                }
                drawInterface();
            }

        }

        if (mBrushActive && toolState != Buttons.BRUSH_BUTTON) {
            mBrushActive = false;
            drawInterface();
        }

        if (mHighlightBoundingBoxes && toolState != Buttons.SELECTION_BUTTON) {
            mHighlightBoundingBoxes = null;
            drawInterface();
        }
    }

    function onPointerUp(screenCoords, toolState) {
        mInteracting = false;
        mStartPos = null;

        if (toolState == Buttons.BRUSH_BUTTON && mBrushOptions.currentStroke.length > 1) {
            mStrokeCallback(new Data.Stroke(mBrushOptions.currentStroke, mBrushOptions.size, mBrushOptions.color))
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

    function highlight(objs) {
        if (!objs || (Array.isArray(objs) && objs.length == 0)) {
            mHighlightBoundingBoxes = null;
        } else {
            mHighlightBoundingBoxes = [];
            mHighlightBoundingBoxes.push(...objs
                .filter(o => o instanceof Data.Element)
                .map(e => DataUtil.getBoundingBox(e)));
            mHighlightBoundingBoxes.push(...objs
                .filter(o => o instanceof Data.Group)
                .map(group => group.elements)
                .flat()
                .map(e => DataUtil.getBoundingBox(e)));
            mHighlightBoundingBoxes.push(...objs
                .filter(o => o instanceof Data.Stroke)
                .map(s => DataUtil.getBoundingBox(s)))
        }
        drawInterface();
    }

    function draw() {
        let ctx = mCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));

        ctx.save();

        let zoom = getZoom();
        ctx.translate(zoom.x, zoom.y)
        ctx.scale(zoom.k, zoom.k)

        mModel.getElements().forEach(elem => {
            elem.strokes.forEach(stroke => {
                ctx.save();

                ctx.translate(elem.x, elem.y);
                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.size;

                ctx.beginPath();
                ctx.moveTo(stroke.path[0].x - 1, stroke.path[0].y - 1);
                stroke.path.forEach(p => ctx.lineTo(p.x, p.y));

                ctx.stroke();

                ctx.restore();
            })
        })

        ctx.restore();

        drawInteraction();
    }

    function drawInteraction() {
        let ctx = mInteractionCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));

        ctx.save();

        let zoom = getZoom();
        ctx.translate(zoom.x, zoom.y)
        ctx.scale(zoom.k, zoom.k)

        mModel.getElements().forEach(elem => {
            elem.strokes.forEach(stroke => {
                let code = getCode(stroke.id);

                ctx.save();

                ctx.translate(elem.x, elem.y);
                ctx.strokeStyle = code;
                ctx.lineWidth = stroke.size + mTargetIncrease / zoom.k;

                ctx.beginPath();
                ctx.moveTo(stroke.path[0].x - 1, stroke.path[0].y - 1);
                stroke.path.forEach(p => ctx.lineTo(p.x, p.y));

                ctx.stroke();
                ctx.restore();
            })
        })

        ctx.restore();
    }

    function drawInterface() {
        let ctx = mInterfaceCanvas.node().getContext("2d");
        ctx.clearRect(0, 0, mInterfaceCanvas.attr("width"), mInterfaceCanvas.attr("height"));
        let zoom = getZoom();

        if (mBrushActive) {
            ctx.save();

            ctx.translate(zoom.x, zoom.y)
            ctx.scale(zoom.k, zoom.k)

            if (mBrushActive) {
                ctx.strokeStyle = mBrushOptions.color;
                ctx.lineWidth = mBrushOptions.size;

                ctx.beginPath();
                ctx.moveTo(mBrushOptions.currentStroke[0].x - 1, mBrushOptions.currentStroke[0].y - 1);
                mBrushOptions.currentStroke.forEach(p => ctx.lineTo(p.x, p.y));

                ctx.stroke();
            }

            ctx.restore();
        }

        if (mHighlightBoundingBoxes) {
            ctx.save();
            ctx.translate(zoom.x, zoom.y)
            ctx.scale(zoom.k, zoom.k)
            ctx.lineWidth = 2 / zoom.k;
            ctx.setLineDash([5 / zoom.k, 10 / zoom.k]);
            ctx.strokeStyle = "grey";
            mHighlightBoundingBoxes.forEach(boundingBox => {
                ctx.beginPath();
                ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
                ctx.stroke();
            })
            ctx.restore();
        }
    }

    function getZoom() {
        return d3.zoomTransform(mInterfaceCanvas.node());
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
            let code = DataUtil.numToColor(mColorIndex++);
            mInteractionLookup[code] = strokeId;
            mReverseInteractionLookup[strokeId] = code;
            return code;
        }
    }

    function screenToModelCoords(screenCoords) {
        let boundingBox = mInterfaceCanvas.node().getBoundingClientRect();
        let zoomPan = getZoom();
        if (ValUtil.checkConvertionState(screenCoords, boundingBox, zoomPan)) {
            return {
                x: (screenCoords.x - boundingBox.x - zoomPan.x) / zoomPan.k,
                y: (screenCoords.y - boundingBox.y - zoomPan.y) / zoomPan.k
            };
        } else {
            return { x: 0, y: 0 };
        }
    }

    function modelToScreenCoords(modelCoords) {
        let boundingBox = mInterfaceCanvas.node().getBoundingClientRect();
        let zoomPan = getZoom();
        if (ValUtil.checkConvertionState(screenCoords, boundingBox, zoomPan)) {
            return {
                x: (modelCoords.x * zoomPan.k) + boundingBox.x + zoomPan.x,
                y: (modelCoords.y * zoomPan.k) + boundingBox.y + zoomPan.y
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
        highlight,
        setStrokeCallback: (func) => mStrokeCallback = func,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
    }
}
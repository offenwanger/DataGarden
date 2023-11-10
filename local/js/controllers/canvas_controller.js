
function CanvasController() {
    const DRAWING = 'drawing';
    const SELECTING = 'selecting';
    const PANNING = 'panning';
    const ZOOMING = 'zooming';
    const DRAGGING = 'dragging';

    const SELECTION_BUBBLE_COLOR = "#55555555";

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

    let mSelectionIds = [];

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 1;
    let mTargetIncrease = 5;

    let mModel = new DataModel();
    let mInteraction = null;

    function onModelUpdate(model) {
        mModel = model;
        mHighlightIds = []
        draw();
    }

    function onPointerDown(screenCoords, toolState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect()))
            return false;

        if (toolState == Buttons.PANNING_BUTTON) {
            mInteraction = {
                type: PANNING,
                x: mZoomTransform.x,
                y: mZoomTransform.y,
                scale: mZoomTransform.k,
                start: screenCoords,
            };
            return true;
        } else if (toolState == Buttons.ZOOM_BUTTON) {
            let zoomCenter = screenToModelCoords(screenCoords);
            mInteraction = {
                type: ZOOMING,
                pointerX: zoomCenter.x,
                pointerY: zoomCenter.y,
                transformX: mZoomTransform.x,
                transformY: mZoomTransform.y,
                scale: mZoomTransform.k,
                start: screenCoords,
            };
            return true;
        } else if (toolState == Buttons.BRUSH_BUTTON) {
            mInteraction = { type: DRAWING };
            mBrushOptions.currentStroke = [screenToModelCoords(screenCoords)];
            return true;
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            let target = getInteractionTarget(screenCoords);
            if (mSelectionIds.includes(target)) {
                mInteraction = {
                    type: DRAGGING,
                    start: screenCoords
                };
            } else {
                mSelectionIds = [];
                mInteraction = { type: SELECTING, line: [screenToModelCoords(screenCoords)] };
            }
            return true;
        } else if (toolState == Buttons.SHIFT_SELECTION_BUTTON) {
            // start select interaction
        }
    }

    function onPointerMove(screenCoords, toolState) {
        if (mInteraction && mInteraction.type == PANNING) {
            let mouseDist = MathUtil.subtract(screenCoords, mInteraction.start);
            let translate = MathUtil.add(mInteraction, mouseDist);
            mZoomTransform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mInteraction.scale);
            draw();
            drawInterface();
        } else if (mInteraction && mInteraction.type == ZOOMING) {
            let mouseDist = screenCoords.y - mInteraction.start.y;
            let scale = mInteraction.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
            let zoomChange = scale - mInteraction.scale;
            let transformX = -(mInteraction.pointerX * zoomChange) + mInteraction.transformX;
            let transformY = -(mInteraction.pointerY * zoomChange) + mInteraction.transformY;
            mZoomTransform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
            draw();
            drawInterface();
        } else if (mInteraction && mInteraction.type == DRAWING) {
            mBrushOptions.currentStroke.push(screenToModelCoords(screenCoords));
            drawInterface();
        } else if (mInteraction && mInteraction.type == SELECTING) {
            mInteraction.line.push(screenToModelCoords(screenCoords));
            drawInterface();
        } else if (mInteraction && mInteraction.type == DRAGGING) {
            console.error("impliment me!")
        } else if (mInteraction) {
            console.error("Not Handled!", mInteraction);
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
        let interaction = mInteraction;
        mInteraction = null;

        if (toolState == Buttons.BRUSH_BUTTON && mBrushOptions.currentStroke.length > 1) {
            mNewStrokeCallback(new Data.Stroke(mBrushOptions.currentStroke, mBrushOptions.size, mBrushOptions.color))
            mBrushOptions.currentStroke = [screenToModelCoords(screenCoords)];
            drawInterface();
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            if (interaction && interaction.type == SELECTING) {
                let moveDist = MathUtil.length(MathUtil.subtract(interaction.line[0], screenToModelCoords(screenCoords)));
                if (moveDist > 5 || interaction.line.length > 5) {
                    mModel.getStrokes().forEach(stroke => {
                        let coveredPoints = stroke.path.reduce((count, p) => {
                            if (interfaceIsCovered(modelToScreenCoords(p))) { count++; }
                            return count;
                        }, 0)
                        if (coveredPoints / stroke.path.length > 0.7) {
                            mSelectionIds.push(stroke.id);
                        }
                    })
                } else {
                    // we tapped not on a selection
                    let target = getInteractionTarget(screenCoords);
                    if (target) {
                        let element = mModel.getElementForStroke(target);
                        return { type: EventResponse.CONTEXT_MENU_ELEMENT, elementId: element.id };
                    }
                }
            } else if (interaction && interaction.type == DRAGGING) {
                let moveDist = MathUtil.length(MathUtil.subtract(interaction.start, screenCoords));
                if (moveDist < 5) {
                    return { type: EventResponse.CONTEXT_MENU_STROKES, strokes: mSelectionIds };
                } else {
                    console.error("Moved selection, impliment!");
                }
            }
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
        } else if (mInteraction && mInteraction.type == SELECTING) {
            mDrawingUtil.drawSelectionBubble(mInteraction.line, SELECTION_BUBBLE_COLOR);
        }

        mSelectionIds.forEach(id => {
            let stroke = mModel.getStroke(id);
            if (!stroke) { console.error("Invalid stroke id", id); return; }
            mDrawingUtil.highlightBoundingBox(DataUtil.getBoundingBox(stroke));
        })

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

    function interfaceIsCovered(screenCoords) {
        let boundingBox = mInteractionCanvas.node().getBoundingClientRect();
        if (screenCoords.x < boundingBox.x || screenCoords.x > boundingBox.x + boundingBox.width) {
            return false;
        } else if (screenCoords.y < boundingBox.y || screenCoords.y > boundingBox.y + boundingBox.height) {
            return false;
        }

        let ctx = mInterfaceCanvas.node().getContext('2d');
        let p = ctx.getImageData(screenCoords.x - boundingBox.x, screenCoords.y - boundingBox.y, 1, 1).data;
        let hex = DataUtil.rgbaToHex(p[0], p[1], p[2], p[3]);
        if (hex != "#00000000") return true;
        else return false;
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

    function modelToScreenCoords(modelCoords) {
        let boundingBox = mInterfaceCanvas.node().getBoundingClientRect();
        return {
            x: modelCoords.x * mZoomTransform.k + mZoomTransform.x + boundingBox.x,
            y: modelCoords.y * mZoomTransform.k + mZoomTransform.y + boundingBox.y
        };

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
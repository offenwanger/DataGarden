
function CanvasController(mColorMap) {
    const DRAWING = 'drawing';
    const LASSO = 'lasso';
    const PANNING = 'panning';
    const ZOOMING = 'zooming';
    const DRAGGING = 'dragging';

    const SELECTION_BUBBLE_COLOR = "#55555555";

    let mCanvas = d3.select('#canvas-view-container').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#canvas-view-container").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#canvas-view-container").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mDrawingUtil = new DrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d"),
        mInterfaceCanvas.node().getContext("2d"),
    );

    let mCodeUtil = new CodeUtil();

    let mNewStrokeCallback = () => { };
    let mHighlightCallback = () => { };
    let mSelectionCallback = () => { };
    let mContextMenuCallback = () => { };
    let mParentUpdateCallback = () => { };

    let mZoomTransform = d3.zoomIdentity;
    let mBrushActivePosition = false;
    let mStructureMode = null;

    let mBrushOptions = {
        size: 1,
        color: "#000000FF"
    }

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mModel = new DataModel();
    let mProjections = {};
    let mInteraction = null;

    function onModelUpdate(model) {
        mModel = model;
        mProjections = {};
        let elements = model.getElements();
        elements.forEach(element => {
            if (element.parentId) {
                let parent = elements.find(e => e.id == element.parentId);
                if (!parent) { console.error("Invalid parent id!", element.parentId); return; }
                mProjections[element.id] = PathUtil.getPositionForPercent(parent.spine, element.position);
            }
        })
        mHighlightIds = [];
        mSelectionIds = mSelectionIds.filter(id => !DataUtil.isDataId(id) || DataUtil.itemExists(id, model));
        draw();
    }

    function onHighlight(highlightedIds) {
        mHighlightIds = [];
        if (!highlightedIds || !Array.isArray(highlightedIds)) return;
        highlightedIds.forEach(id => {
            if (IdUtil.isType(id, Data.Element)) {
                let element = mModel.getElement(id);
                if (!element) { console.error("Invalid state, id not found", id); return id; }
                mHighlightIds.push(...element.strokes.map(s => s.id))
            } else {
                return mHighlightIds.push(id);
            }
        });

        draw();
    }

    function onSelection(selectedIds) {
        mSelectionIds = [];
        if (!selectedIds || !Array.isArray(selectedIds)) return;
        selectedIds.forEach(id => {
            if (IdUtil.isType(id, Data.Element)) {
                let element = mModel.getElement(id);
                if (!element) { console.error("Invalid state, id not found", id); return id; }
                mSelectionIds.push(...element.strokes.map(s => s.id))
            } else {
                return mSelectionIds.push(id);
            }
        });
        draw();
    }

    function onPointerDown(screenCoords, systemState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) return;

        if (systemState.getToolState() == Buttons.PANNING_BUTTON) {
            mInteraction = {
                type: PANNING,
                x: mZoomTransform.x,
                y: mZoomTransform.y,
                scale: mZoomTransform.k,
                start: screenCoords,
            };
        } else if (systemState.getToolState() == Buttons.ZOOM_BUTTON) {
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
        } else if (systemState.getToolState() == Buttons.BRUSH_BUTTON && !systemState.isShift() && !systemState.isCtrl()) {
            mInteraction = {
                type: DRAWING,
                currentStroke: [screenToModelCoords(screenCoords)]
            };
        } else if (systemState.getToolState() == Buttons.SELECTION_BUTTON ||
            (systemState.getToolState() == Buttons.BRUSH_BUTTON && (systemState.isShift() || systemState.isCtrl()))) {
            let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            if (target) {
                if (systemState.isShift()) {
                    mSelectionIds.push(target.id);
                    mSelectionCallback(mSelectionIds);
                } else if (systemState.isCtrl()) {
                    if (mSelectionIds.includes(target.id)) {
                        mSelectionIds.splice(mSelectionIds.indexOf(target.id), 1);
                        mSelectionCallback(mSelectionIds);
                    }
                } else if (!mSelectionIds.includes(target.id)) {
                    mSelectionIds = [target.id];
                    mSelectionCallback(mSelectionIds);
                }
                mInteraction = {
                    type: DRAGGING,
                    start: screenCoords,
                    startTarget: target,
                };
            } else {
                // we didn't mouse down on anything start a lasso. 
                mInteraction = {
                    type: LASSO,
                    line: [screenToModelCoords(screenCoords)]
                };
            }
            return true;
        } else if (systemState.getToolState() == ContextButtons.PARENT) {
            let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            if (target && IdUtil.isType(target.id, Data.Stroke)) {
                let targetElement = mModel.getElementForStroke(target.id);
                if (!targetElement) { console.error("Invalid stroke id", target.id); return; }
                let elementIds = DataUtil.unique(mSelectionIds.map(id => {
                    if (IdUtil.isType(id, Data.Stroke)) {
                        let element = mModel.getElementForStroke(id);
                        if (!element) { console.error("Invalid stroke id", id); return null; }
                        return element.id
                    }
                }).filter(id => id && id != targetElement.id));
                if (elementIds.length > 0) {
                    mParentUpdateCallback(elementIds, targetElement.id);
                }
            }
        } else {
            console.error('State not handled', systemState.getToolState())
        }

        draw();
    }

    function onPointerMove(screenCoords, systemState) {
        if (mInteraction && mInteraction.type == PANNING) {
            let mouseDist = VectorUtil.subtract(screenCoords, mInteraction.start);
            let translate = VectorUtil.add(mInteraction, mouseDist);
            mZoomTransform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mInteraction.scale);
        } else if (mInteraction && mInteraction.type == ZOOMING) {
            let mouseDist = screenCoords.y - mInteraction.start.y;
            let scale = mInteraction.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
            let zoomChange = scale - mInteraction.scale;
            let transformX = -(mInteraction.pointerX * zoomChange) + mInteraction.transformX;
            let transformY = -(mInteraction.pointerY * zoomChange) + mInteraction.transformY;
            mZoomTransform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
        } else if (mInteraction && mInteraction.type == DRAWING) {
            mInteraction.currentStroke.push(screenToModelCoords(screenCoords));
        } else if (mInteraction && mInteraction.type == LASSO) {
            mInteraction.line.push(screenToModelCoords(screenCoords));
        } else if (mInteraction && mInteraction.type == DRAGGING) {
            console.error("impliment me!")
        } else if (mInteraction) {
            console.error("Not Handled!", mInteraction);
        } else if (systemState.getToolState() == Buttons.BRUSH_BUTTON) {
            mBrushActivePosition = [screenToModelCoords(screenCoords)];
        }

        if (systemState.getToolState() == Buttons.SELECTION_BUTTON || systemState.getToolState() == ContextButtons.PARENT) {
            let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            if (target) {
                let element = mModel.getElementForStroke(target.id);
                mHighlightIds = element.strokes.map(s => s.id);
                mHighlightCallback(mHighlightIds);
            } else {
                mHighlightIds = [];
                mHighlightCallback([]);
            }
        } else if (mHighlightIds) {
            mHighlightIds = [];
            mHighlightCallback([]);
        }

        if (mBrushActivePosition && systemState.getToolState() != Buttons.BRUSH_BUTTON) {
            mBrushActivePosition = false;
        }

        draw();
    }

    function onPointerUp(screenCoords, systemState) {
        let interaction = mInteraction;
        mInteraction = null;

        if (interaction && interaction.type == DRAWING && interaction.currentStroke.length > 1) {
            mNewStrokeCallback(new Data.Stroke(interaction.currentStroke, mBrushOptions.size, mBrushOptions.color))
        } else if (interaction && interaction.type == LASSO) {
            if (!systemState.isShift() && !systemState.isCtrl()) {
                mSelectionIds = [];
            }
            mModel.getStrokes().forEach(stroke => {
                let coveredPoints = stroke.path.reduce((count, p) => {
                    if (interfaceIsCovered(modelToScreenCoords(p))) { count++; }
                    return count;
                }, 0)
                if (coveredPoints / stroke.path.length > 0.7) {
                    if (systemState.isCtrl()) {
                        mSelectionIds.splice(mSelectionIds.indexOf(stroke.id), 1);
                    } else {
                        mSelectionIds.push(stroke.id);
                    }
                }
            })
            mSelectionCallback(mSelectionIds);
        } else if (interaction && interaction.type == DRAGGING && !systemState.isShift() && !systemState.isCtrl()) {
            let moveDist = VectorUtil.dist(interaction.start, screenCoords);
            if (moveDist < 5) {
                let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
                mContextMenuCallback(screenCoords, mSelectionIds, interaction.startTarget.id);
            } else {
                console.error("Moved selection, impliment!");
            }
        }

        draw();
    }

    function onResize(width, height) {
        d3.select("#canvas-view-container")
            .style('width', width + "px")
            .style('height', height + "px");
        mCanvas
            .attr('width', width)
            .attr('height', height);
        mInterfaceCanvas
            .attr('width', width)
            .attr('height', height);
        mInteractionCanvas
            .attr('width', width)
            .attr('height', height);
        draw();
    }

    function setColor(color) {
        mBrushOptions.color = color;
        draw();
    }

    function setStructureMode(to) {
        mStructureMode = to;
    }

    function draw() {
        mDrawingUtil.reset(mZoomTransform);
        mModel.getElements().forEach(elem => {
            elem.strokes.forEach(stroke => {
                mDrawingUtil.drawStroke({
                    path: stroke.path,
                    color: stroke.color,
                    width: stroke.size,
                    shadow: mHighlightIds.includes(stroke.id) || mHighlightIds.includes(elem.id),
                    outline: mSelectionIds.includes(elem.id) || mSelectionIds.includes(stroke.id) ? mColorMap(elem.id) : null,
                    code: mCodeUtil.getCode(stroke.id)
                })
            })
        })

        mDrawingUtil.resetInterface(mZoomTransform);

        if (mInteraction && mInteraction.type == DRAWING) {
            mDrawingUtil.drawInterfaceStroke(mInteraction.currentStroke, mBrushOptions.color, mBrushOptions.size)
        } else if (mBrushActivePosition) {
            mDrawingUtil.drawInterfaceStroke([mBrushActivePosition], mBrushOptions.color, mBrushOptions.size)
        } else if (mInteraction && mInteraction.type == LASSO) {
            mDrawingUtil.drawInterfaceSelectionBubble(mInteraction.line, SELECTION_BUBBLE_COLOR);
        }

        if (mStructureMode) {
            mModel.getElements().forEach(elem => {
                mDrawingUtil.drawSpine(elem.spine)
                mDrawingUtil.drawRoot(elem.root, mProjections[elem.id])
                mDrawingUtil.drawAngle(elem.root, elem.angle)
            });
        }
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
        setStructureMode,
        onSelection,
        onHighlight,
        setNewStrokeCallback: (func) => mNewStrokeCallback = func,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
        setContextMenuCallback: (func) => mContextMenuCallback = func,
        setParentUpdateCallback: (func) => mParentUpdateCallback = func,
    }
}
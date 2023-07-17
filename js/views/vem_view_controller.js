
function VemViewController() {
    let mCanvas = d3.select('#vem-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#vem-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#vem-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mHighlightCallback = () => { };
    let mSelectionCallback = () => { };
    let mHighlightElements = null;

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 1;
    let mTargetIncrease = 5;

    let mPanZoom = d3.zoom();

    let mModel = new DataModel();
    let mInteracting;
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
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            if (mInteracting) {
                // WE are either dragging a group, or a dimention, or something
            } else {
                if (!ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
                    let targetId = getInteractionTarget(screenCoords);
                    let element = mModel.getElement(targetId);
                    if (element) {
                        mHighlightElements = [element];
                        mHighlightCallback(mHighlightElements);
                    } else {
                        mHighlightElements = null;
                        mHighlightCallback(null);
                    }
                }
                drawInterface();
            }
        }

        if (mHighlightElements && toolState != Buttons.SELECTION_BUTTON) {
            mHighlightElements = null;
            drawInterface();
        }
    }

    function onPointerUp(screenCoords, toolState) {
        mInteracting = false;
        mStartPos = null;
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
            mHighlightElements = null;
        } else {
            mHighlightElements = objs.filter(o => o instanceof Data.Element);
            mHighlightElements.push(...objs.filter(o => o instanceof Data.Group).map(g => g.elements).flat());
            mHighlightElements.push(...objs.filter(o => o instanceof Data.Stroke).map(s => mModel.getElementForStroke(s.id)));
            mHighlightElements = mHighlightElements.filter((element, index, self) => self.findIndex(g => g.id == element.id) == index);
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
            drawIcon(ctx, elem);
        })

        ctx.restore();

        drawInteraction();
    }

    function drawIcon(ctx, elem) {
        ctx.save();

        ctx.translate(elem.vemX, elem.vemY);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, 64, 64);
        ctx.stroke();

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.shadowColor = "black";
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 3;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 64, 64);
        ctx.restore();

        let miniScale = 56 / Math.max(elem.height, elem.width);
        ctx.beginPath();
        ctx.rect(0, 0, 64, 64);
        ctx.clip();
        ctx.translate((64 - (elem.width * miniScale)) / 2, (64 - (elem.height * miniScale)) / 2)
        ctx.scale(miniScale, miniScale);

        elem.strokes.forEach(stroke => {
            ctx.save();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.beginPath();
            ctx.moveTo(stroke.path[0].x - 1, stroke.path[0].y - 1);
            stroke.path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
        })

        ctx.restore();
    }

    function drawInteraction() {
        let ctx = mInteractionCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));
        let zoom = getZoom();

        ctx.save();
        ctx.translate(zoom.x, zoom.y)
        ctx.scale(zoom.k, zoom.k)

        mModel.getElements().forEach(g => {
            let code = getCode(g.id);
            ctx.save();
            ctx.translate(g.vemX, g.vemY);
            ctx.fillStyle = code;
            ctx.fillRect(0, 0, 64, 64);
            ctx.restore();
        })

        ctx.restore();
    }

    function drawInterface() {
        let ctx = mInterfaceCanvas.node().getContext("2d");
        ctx.clearRect(0, 0, mInterfaceCanvas.attr("width"), mInterfaceCanvas.attr("height"));

        let zoom = getZoom();
        ctx.translate(zoom.x, zoom.y)
        ctx.scale(zoom.k, zoom.k)

        if (mHighlightElements) {
            ctx.save();
            ctx.translate(zoom.x, zoom.y)
            ctx.scale(zoom.k, zoom.k)
            mHighlightElements.forEach(e => {
                ctx.save();
                ctx.translate(e.vemX, e.vemY);
                ctx.strokeStyle = "red";
                ctx.beginPath();
                ctx.rect(0, 0, 64, 64);
                ctx.stroke();
                ctx.restore();
            })
            ctx.restore();
        }
    }

    function getZoom() {
        return d3.zoomTransform(mInterfaceCanvas.node());
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
        onResize,
        highlight,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
    }
}
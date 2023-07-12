
function StrokeViewController() {
    let mCanvas = d3.select('#stroke-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);

    let mInterfaceCanvas = d3.select("#stroke-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);

    let mPanZoom = d3.zoom();

    let mBrushOptions = {
        size: 10,
        color: "#000000FF",
        currentStroke: [{ x: 0, y: 0 }]
    }

    let mModel = new Data.DataModel();
    let mBrushActive;
    let mStartPos;

    let mStrokeCallback = () => { };

    function onModelUpdate(model) {
        mModel = model;
        draw();
    }

    function onResize(height, width) {
        mCanvas
            .attr('width', height)
            .attr('height', width);
        mInterfaceCanvas
            .attr('width', height)
            .attr('height', width);
        draw();
        drawInterface();
    }

    function onZoomStart(startPos) {
        let zoom = getZoom();
        let zoomCenter = screenToModelCoords(startPos)

        mStartPos = {
            pointerX: zoomCenter.x,
            pointerY: zoomCenter.y,
            transformX: zoom.x,
            transformY: zoom.y,
            scale: zoom.k
        }
    }

    function onZoom(mouseDist) {
        if (!mStartPos) console.error("Bad State, trying to zoom before starting zoom. Start posistion is: ", mStartPos);

        let scale = mStartPos.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
        let zoomChange = scale - mStartPos.scale;
        let transformX = -(mStartPos.pointerX * zoomChange) + mStartPos.transformX;
        let transformY = -(mStartPos.pointerY * zoomChange) + mStartPos.transformY;
        let transform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
        mInterfaceCanvas.call(mPanZoom.transform, transform);

        draw();
    }

    function onZoomEnd() {
        mStartPos = null;
    }

    function onPanStart() {
        let zoom = getZoom();
        mStartPos = {
            x: zoom.x,
            y: zoom.y,
            scale: zoom.k
        }
    }

    function onPan(mouseDist) {
        if (!mStartPos) console.error("Bad State, trying to pan before starting pan. Start posistion is: ", mStartPos);

        let translate = MathUtil.add(mStartPos, mouseDist);
        let transform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mStartPos.scale);
        mInterfaceCanvas.call(mPanZoom.transform, transform);

        draw();
    }

    function onPanEnd() {
        mStartPos = null;
    }

    function setPanActive(active) {
        if (active) {
            mInterfaceCanvas.call(mPanZoom);
        } else {
            mInterfaceCanvas.on('.zoom', null);
        }
    }

    function onBrushStart() {
        // don't have to do anything right now
    }

    function onBrush(screenCoords) {
        mBrushOptions.currentStroke.push(screenToModelCoords(screenCoords));
        drawInterface();
    }

    function onBrushEnd() {
        mStrokeCallback(new Data.Stroke(mBrushOptions.currentStroke, mBrushOptions.size, mBrushOptions.color))
        mBrushOptions.currentStroke = [mBrushOptions.currentStroke[mBrushOptions.currentStroke.length - 1]];
        drawInterface();
    }

    function setBrushActive(active) {
        mBrushActive = active;
        drawInterface();
    }

    function onBrushMove(screenCoords) {
        mBrushOptions.currentStroke = [screenToModelCoords(screenCoords)];
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
    }

    function drawInterface() {
        let ctx = mInterfaceCanvas.node().getContext("2d");
        ctx.clearRect(0, 0, mInterfaceCanvas.attr("width"), mInterfaceCanvas.attr("height"));

        if (mBrushActive) {
            ctx.save();

            let zoom = getZoom();
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

    return {
        onModelUpdate,
        onZoomStart,
        onZoom,
        onZoomEnd,
        onPanStart,
        onPan,
        onPanEnd,
        setPanActive,
        onBrushStart,
        onBrush,
        onBrushEnd,
        setBrushActive,
        onBrushMove,
        onResize,
        setStrokeCallback: (func) => mStrokeCallback = func,
    }
}

function VemViewController() {
    let mCanvas = d3.select('#vem-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);

    let mInterfaceCanvas = d3.select("#vem-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);

    let mPanZoom = d3.zoom();

    let mModel = new Data.DataModel();
    let mStartPos;

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

    function drawInterface() {
        let ctx = mInterfaceCanvas.node().getContext("2d");
        ctx.clearRect(0, 0, mInterfaceCanvas.attr("width"), mInterfaceCanvas.attr("height"));
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
        onResize,
        setStrokeCallback: (func) => mStrokeCallback = func,
    }
}
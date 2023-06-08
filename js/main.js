document.addEventListener('DOMContentLoaded', function (e) {
    let mCanvas = d3.select('#canvas_container').append('canvas')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)

    let mEventManager = new EventManager();

    let drawingLog = [];

    mEventManager.onResize(() => {
        mCanvas.attr('width', window.innerWidth)
            .attr('height', window.innerHeight);
        draw();
    })

    mEventManager.onZoom((transform) => {
        draw();
    })

    mEventManager.onStroke((path, size, color) => {
        drawingLog.push({ time: Date.now(), path, size, color });
        draw();
    })

    function draw() {
        let ctx = mCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));

        ctx.save();

        let zoom = mEventManager.getZoom();
        ctx.translate(zoom.x, zoom.y)
        ctx.scale(zoom.k, zoom.k)

        drawingLog.forEach(stroke => {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;

            ctx.beginPath();
            ctx.moveTo(stroke.path[0].x - 1, stroke.path[0].y - 1);
            stroke.path.forEach(p => ctx.lineTo(p.x, p.y));

            ctx.stroke();
        })

        ctx.restore();
    }

    draw();
});
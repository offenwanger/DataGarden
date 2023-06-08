document.addEventListener('DOMContentLoaded', function (e) {
    let mCanvas = d3.select('#canvas_container').append('canvas')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)
    let mViewTransform = d3.zoomIdentity;

    let mEventManager = new EventManager();

    mEventManager.onResize(() => {
        mCanvas.attr('width', window.innerWidth)
            .attr('height', window.innerHeight);
        draw();
    })

    mEventManager.onZoom((transform) => {
        mViewTransform = transform;
        draw();
    })

    function draw() {
        let ctx = mCanvas.node().getContext('2d');
        ctx.save();
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));
        ctx.translate(mViewTransform.x, mViewTransform.y)
        ctx.scale(mViewTransform.k, mViewTransform.k)
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(0, 0, 150, 75);
        ctx.restore();
    }

    draw();
});
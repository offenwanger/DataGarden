
function StructViewController() {
    let mCanvas = d3.select('#struct-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#struct-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#struct-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mHighlightCallback = () => { };
    let mSelectionCallback = () => { };
    let mHighlightGroupIds = null;

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 1;
    let mTargetIncrease = 5;

    let mZoomTransform = d3.zoomIdentity;

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
            mStartPos = {
                x: mZoomTransform.x,
                y: mZoomTransform.y,
                scale: mZoomTransform.k,
                screenCoords,
            }

            mInteracting = true;
            return true;
        } else if (toolState == Buttons.ZOOM_BUTTON) {
            mInteracting = true;

            let zoomCenter = screenToModelCoords(screenCoords)

            mStartPos = {
                pointerX: zoomCenter.x,
                pointerY: zoomCenter.y,
                transformX: mZoomTransform.x,
                transformY: mZoomTransform.y,
                scale: mZoomTransform.k,
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
            mZoomTransform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mStartPos.scale);
            draw();
            drawInterface();
        } else if (toolState == Buttons.ZOOM_BUTTON && mInteracting) {
            let mouseDist = screenCoords.y - mStartPos.screenCoords.y;
            let scale = mStartPos.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
            let zoomChange = scale - mStartPos.scale;
            let transformX = -(mStartPos.pointerX * zoomChange) + mStartPos.transformX;
            let transformY = -(mStartPos.pointerY * zoomChange) + mStartPos.transformY;
            let transform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
            mZoomTransform = transform;
            draw();
            drawInterface();
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            if (mInteracting) {
                // WE are either dragging a group, or a dimention, or something
            } else {
                if (!ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
                    let targetId = getInteractionTarget(screenCoords);
                    if (targetId) {
                        mHighlightGroupIds = [targetId];
                        mHighlightCallback(mHighlightGroupIds);
                    } else {
                        mHighlightGroupIds = null;
                        mHighlightCallback(null);
                    }
                }
                drawInterface();
            }

        }

        if (mHighlightGroupIds && toolState != Buttons.SELECTION_BUTTON) {
            mHighlightGroupIds = null;
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

    function highlight(ids) {
        if (!ids || (Array.isArray(ids) && ids.length == 0)) {
            mHighlightGroupIds = null;
        } else {
            mHighlightGroupIds = ids.filter(id => IdUtil.isType(id, Data.Group));
            mHighlightGroupIds.push(...ids.filter(id => IdUtil.isType(id, Data.Element)).map(eId => mModel.getGroupForElement(eId).id));
            mHighlightGroupIds.push(...ids.filter(id => IdUtil.isType(id, Data.Stroke)).map(sId => mModel.getGroupForElement(sId).id));
            mHighlightGroupIds = mHighlightGroupIds.filter((groupId, index, self) => self.findIndex(gId => gId == groupId) == index);
        }
        drawInterface();
    }


    function draw() {
        let ctx = mCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));
        ctx.save();

        ctx.translate(mZoomTransform.x, mZoomTransform.y)
        ctx.scale(mZoomTransform.k, mZoomTransform.k)

        mModel.getGroups().forEach(g => {
            drawIcon(ctx, g);
        })

        ctx.restore();

        drawInteraction();
    }

    function drawIcon(ctx, group) {
        ctx.save();
        let boundingBox = PathUtil.getBoundingBox(group.elements.map(e => e.strokes.map(s => PathUtil.translate(s.path, e)).flat()));
        if (!boundingBox) return;
        ctx.translate(group.structX, group.structY);

        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(0, 0, 128, 128);
        ctx.stroke();

        ctx.shadowColor = "black";
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 3;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 128, 128);
        ctx.restore();

        ctx.save();
        let miniScale = 110 / Math.max(boundingBox.height, boundingBox.width);
        ctx.beginPath();
        ctx.rect(0, 0, 128, 128);
        ctx.clip();
        ctx.translate((128 - (boundingBox.width * miniScale)) / 2, (128 - (boundingBox.height * miniScale)) / 2)
        ctx.scale(miniScale, miniScale);

        group.elements.forEach(elem => {
            ctx.save();
            let offset = MathUtil.subtract(elem, boundingBox);
            ctx.translate(offset.x, offset.y)

            elem.strokes.forEach(stroke => {
                ctx.save();
                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.size;
                ctx.beginPath();
                ctx.moveTo(stroke.path[0].x - 1, stroke.path[0].y - 1);
                stroke.path.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.stroke();
                ctx.restore();
            });
            ctx.restore();
        });

        ctx.restore();
        ctx.restore();
    }

    function drawInteraction() {
        let ctx = mInteractionCanvas.node().getContext('2d');
        ctx.clearRect(0, 0, mCanvas.attr("width"), mCanvas.attr("height"));

        ctx.save();
        ctx.translate(mZoomTransform.x, mZoomTransform.y)
        ctx.scale(mZoomTransform.k, mZoomTransform.k)

        mModel.getGroups().forEach(g => {
            let code = getCode(g.id);
            ctx.save();
            ctx.translate(g.structX, g.structY);
            ctx.fillStyle = code;
            ctx.fillRect(0, 0, 128, 128);
            ctx.restore();
        })

        ctx.restore();
    }

    function drawInterface() {
        let ctx = mInterfaceCanvas.node().getContext("2d");
        ctx.clearRect(0, 0, mInterfaceCanvas.attr("width"), mInterfaceCanvas.attr("height"));

        if (mHighlightGroupIds) {
            ctx.save();
            ctx.translate(mZoomTransform.x, mZoomTransform.y)
            ctx.scale(mZoomTransform.k, mZoomTransform.k)
            mHighlightGroupIds.forEach(gId => {
                let g = mModel.getGroup(gId);
                ctx.save();
                ctx.translate(g.structX, g.structY);
                ctx.strokeStyle = "red";
                ctx.beginPath();
                ctx.rect(0, 0, 128, 128);
                ctx.stroke();
                ctx.restore();
            })
            ctx.restore();
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
        if (ValUtil.checkConvertionState(screenCoords, boundingBox, mZoomTransform)) {
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
let ImageDrawingUtil = function () {
    let formChannelImage = new Image();
    formChannelImage.src = 'img/form_channel.svg'
    let colorChannelImage = new Image();
    colorChannelImage.src = 'img/color_channel.svg'
    let sizeChannelImage = new Image();
    sizeChannelImage.src = 'img/size_channel.svg'
    let orientationChannelImage = new Image();
    orientationChannelImage.src = 'img/orientation_channel.svg'
    let positionChannelImage = new Image();
    positionChannelImage.src = 'img/position_channel.svg'

    return {
        formChannelImage,
        colorChannelImage,
        sizeChannelImage,
        orientationChannelImage,
        positionChannelImage,
    }
}();

function DrawingUtil(context, interactionContext, interfaceContext) {
    let ctx = context;
    let intCtx = interactionContext;
    let intfCtx = interfaceContext;

    // scale agnostic values
    const TARGET_INCREASE = 5;
    let mScale = 1;

    function reset(width, height, zoomTransform) {
        ctx.reset();
        ctx.clearRect(0, 0, width, height);
        ctx.translate(zoomTransform.x, zoomTransform.y)
        ctx.scale(zoomTransform.k, zoomTransform.k)

        intCtx.reset();
        intCtx.clearRect(0, 0, width, height);
        intCtx.translate(zoomTransform.x, zoomTransform.y)
        intCtx.scale(zoomTransform.k, zoomTransform.k)
        intCtx.imageSmoothingEnabled = false;

        mScale = zoomTransform.k;
    }

    function resetInterface(width, height, zoomTransform) {
        intfCtx.reset();
        intfCtx.clearRect(0, 0, width, height);
        intfCtx.translate(zoomTransform.x, zoomTransform.y)
        intfCtx.scale(zoomTransform.k, zoomTransform.k)
    }

    function drawContainerRect(x, y, width, height, code = null) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.stroke();

        ctx.shadowColor = "black";
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 3;
        ctx.fillStyle = "white";
        ctx.fillRect(x, y, width, height);

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.fillRect(x, y, width, height);
            intCtx.restore();
        }

        ctx.restore();
    }

    function drawTextContainerRect(x, y, width, height, lines, code = null) {
        drawContainerRect(x, y, width, height, code);

        ctx.save();
        ctx.fillStyle = "black";
        let fontSize = height / lines.length - 2 * lines.length;
        ctx.font = fontSize + "px Verdana";
        lines.forEach((line, index) => {
            ctx.fillText(line, x + 10, y + (fontSize + 2) * (index + 1));
        })
        ctx.restore();
    }

    function highlightContainerRect(x, y, width, height) {
        intfCtx.save();
        intfCtx.translate(x, y);
        intfCtx.lineWidth = 1;
        intfCtx.strokeStyle = "red";
        intfCtx.beginPath();
        intfCtx.rect(0, 0, width, height);
        intfCtx.stroke();
        intfCtx.restore();
    }

    function highlightCircle(cx, cy, r, color) {
        intfCtx.save();

        intfCtx.strokeStyle = color;
        intfCtx.lineWidth = 2;

        intfCtx.beginPath();
        intfCtx.arc(cx, cy, r, 0, 2 * Math.PI);
        intfCtx.stroke();

        intfCtx.restore();
    }

    function drawContainerRectSplitInteraction(x, y, width, height, percent, code) {
        intCtx.save();
        y += (1 - percent) * height;
        intCtx.fillStyle = code;
        intCtx.fillRect(x, y, width, height * percent);
        intCtx.restore();
    }

    function drawLetterCircle(cx, cy, r, letter, code = null) {
        ctx.save();

        ctx.strokeStyle = 'black';
        ctx.fillStyle = "white";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "black";
        let fontSize = r * 1.5;
        ctx.font = fontSize + "px Verdana";
        let horizontalTextOffset = -fontSize * 0.4;
        let verticalTextOffset = fontSize / 2 - 1;

        ctx.fillText(letter, cx + horizontalTextOffset, cy + verticalTextOffset);

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.arc(cx, cy, r, 0, 2 * Math.PI);
            intCtx.fill();
            intCtx.restore();
        }

        ctx.restore();
    }

    function drawColorCircle(cx, cy, r, color, code = null) {
        ctx.save();

        ctx.strokeStyle = 'black';
        ctx.fillStyle = color;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.arc(cx, cy, r, 0, 2 * Math.PI);
            intCtx.fill();
            intCtx.restore();
        }

        ctx.restore();
    }

    function drawChannelIconCircle(channelType, cx, cy, r, code = null) {
        const PADDING_SCALE = 0.9;

        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.arc(cx, cy, r, 0, 2 * Math.PI);
            intCtx.fill();
            intCtx.restore();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.clip();

        let img;
        if (channelType == ChannelType.FORM) {
            img = ImageDrawingUtil.formChannelImage;
        } else if (channelType == ChannelType.COLOR) {
            img = ImageDrawingUtil.colorChannelImage;
        } else if (channelType == ChannelType.SIZE) {
            img = ImageDrawingUtil.sizeChannelImage;
        } else if (channelType == ChannelType.ORIENTATION) {
            img = ImageDrawingUtil.orientationChannelImage;
        } else if (channelType == ChannelType.POSITION) {
            img = ImageDrawingUtil.positionChannelImage;
        } else { console.error("Channel type not supported"); return; }


        let width = img.width; // these images should be square
        if (width == 0) {/* we haven't loaded yet, don't draw */ return; }
        let scale = (2 * (r * PADDING_SCALE)) / width;
        let offsetX = cx - r * PADDING_SCALE + (2 * (r * PADDING_SCALE) - scale * width) / 2;
        let offsetY = cy - r * PADDING_SCALE + (2 * (r * PADDING_SCALE) - scale * width) / 2;
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        ctx.drawImage(img, 0, 0);
        ctx.restore();
    }

    function drawThumbnailCircle(strokes, cx, cy, r, code = null) {
        const PADDING_SCALE = 0.7;
        const MIN_PIXELS = 1;

        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.arc(cx, cy, r, 0, 2 * Math.PI);
            intCtx.fill();
            intCtx.restore();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.clip();

        // now do the complicated shifting and scaling stuff
        let bb = DataUtil.getBoundingBox(strokes);
        let scale = (2 * (r * PADDING_SCALE)) / Math.max(bb.width, bb.height);
        let minStroke = MIN_PIXELS / scale / mScale;
        let offsetX = cx - r * PADDING_SCALE + (2 * (r * PADDING_SCALE) - scale * bb.width) / 2;
        let offsetY = cy - r * PADDING_SCALE + (2 * (r * PADDING_SCALE) - scale * bb.height) / 2;

        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        ctx.beginPath();
        strokes.forEach(stroke => {
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = Math.max(stroke.size, minStroke);
            ctx.beginPath();
            ctx.moveTo(stroke.path[0].x - bb.x, stroke.path[0].y - bb.y);
            stroke.path.forEach(p => {
                ctx.lineTo(p.x - bb.x, p.y - bb.y);
            });
            ctx.stroke();
        })

        ctx.restore();
    }

    function drawLines(lines, color, alpha) {
        ctx.save();

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.beginPath();
        lines.forEach((line) => {
            ctx.moveTo(line[0].x, line[0].y);
            ctx.lineTo(line[1].x, line[1].y);
        });
        ctx.stroke();

        ctx.restore();
    }

    function drawLink(start, end, r, color, alpha, code) {
        let triangle = getTrianglePointer(start, end, r, 10);
        ctx.save();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(triangle[0].x, triangle[0].y);
        ctx.lineTo(triangle[1].x, triangle[1].y);
        ctx.lineTo(triangle[2].x, triangle[2].y);
        ctx.fill();

        ctx.restore();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.moveTo(triangle[0].x, triangle[0].y);
            intCtx.lineTo(triangle[1].x, triangle[1].y);
            intCtx.lineTo(triangle[2].x, triangle[2].y);
            intCtx.fill();
            intCtx.restore();
        }
    }

    function drawBubble(outline, color, alpha, code) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();

        // move to the first point
        ctx.moveTo(outline[0].x, outline[0].y);
        let extendedOutline = outline.concat([outline[0]])

        for (var i = 1; i < extendedOutline.length - 1; i++) {
            var xc = (extendedOutline[i].x + extendedOutline[i + 1].x) / 2;
            var yc = (extendedOutline[i].y + extendedOutline[i + 1].y) / 2;
            ctx.quadraticCurveTo(extendedOutline[i].x, extendedOutline[i].y, xc, yc);
        }

        ctx.fill();
        ctx.restore();

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.moveTo(outline[outline.length - 1].x, outline[outline.length - 1].y);
            outline.forEach(p => intCtx.lineTo(p.x, p.y));
            intCtx.fill();
            intCtx.restore();
        }
    }

    function highlightBubble(outline, color) {
        intfCtx.save();

        intfCtx.strokeStyle = color;
        intfCtx.lineWidth = 1;
        intfCtx.beginPath();

        // move to the first point
        intfCtx.moveTo(outline[0].x, outline[0].y);
        let extendedOutline = outline.concat([outline[0]])

        for (var i = 1; i < extendedOutline.length - 1; i++) {
            var xc = (extendedOutline[i].x + extendedOutline[i + 1].x) / 2;
            var yc = (extendedOutline[i].y + extendedOutline[i + 1].y) / 2;
            intfCtx.quadraticCurveTo(extendedOutline[i].x, extendedOutline[i].y, xc, yc);
        }

        intfCtx.stroke();
        intfCtx.restore();

        intfCtx.restore();
    }

    function highlightLink(start, end, r, color) {
        let triangle = getTrianglePointer(start, end, r, 10);

        intfCtx.save();

        intfCtx.fillStyle = color;
        intfCtx.beginPath();
        intfCtx.moveTo(triangle[0].x, triangle[0].y);
        intfCtx.lineTo(triangle[1].x, triangle[1].y);
        intfCtx.lineTo(triangle[2].x, triangle[2].y);
        intfCtx.fill();

        intfCtx.restore();
    }

    function getTrianglePointer(start, end, r, size) {
        if (!start) {
            start = { x: end.x, y: end.y - (2 * r + size) }
        }

        let direction = MathUtil.normalize(MathUtil.subtract(end, start));
        let triangleBase = MathUtil.add(start, MathUtil.scale(direction, r));

        return [
            MathUtil.add(triangleBase, MathUtil.scale({ y: -direction.x, x: direction.y }, size / 2)),
            MathUtil.add(triangleBase, MathUtil.scale({ y: direction.x, x: -direction.y }, size / 2)),
            MathUtil.add(triangleBase, MathUtil.scale(direction, size))
        ]
    }

    function drawStroke(path, color, strokeWidth, code = null) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        path.forEach(p => {
            ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();

        if (code) {
            intCtx.save();
            intCtx.strokeStyle = code;
            intCtx.lineWidth = strokeWidth + TARGET_INCREASE / mScale;
            intCtx.beginPath();
            intCtx.moveTo(path[0].x - 1, path[0].y - 1);
            path.forEach(p => {
                intCtx.lineTo(p.x, p.y)
            });
            intCtx.stroke();
            intCtx.restore();
        }
    }

    function drawInterfaceStroke(path, color, strokeWidth) {
        intfCtx.save();
        intfCtx.strokeStyle = color;
        intfCtx.lineWidth = strokeWidth;
        intfCtx.beginPath();
        intfCtx.moveTo(path[0].x, path[0].y);
        path.forEach(p => {
            intfCtx.lineTo(p.x, p.y);
        });
        intfCtx.stroke();
        intfCtx.restore();
    }


    function drawConnector(top, bottom, left, right) {
        let pathStart = [];
        let pathEnd = [];

        if (top) {
            pathStart.push({ x: top.x, y: top.y });
            pathStart.push({ x: top.x, y: top.y + 5 });
        } else if (bottom) {
            pathStart.push({ x: bottom.x, y: bottom.y });
            pathStart.push({ x: bottom.x, y: bottom.y - 5 });
        } else if (left) {
            pathStart.push({ x: left.x, y: left.y });
            pathStart.push({ x: left.x + 5, y: left.y });
        } else { console.error("bad parameters", top, left, bottom, right); return; }

        if (right) {
            pathEnd.unshift({ x: right.x, y: right.y })
            pathEnd.unshift({ x: right.x - 5, y: right.y })
        } else if (left) {
            pathEnd.unshift({ x: left.x, y: left.y })
            pathEnd.unshift({ x: left.x + 5, y: left.y })
        } else if (bottom) {
            pathEnd.unshift({ x: bottom.x, y: bottom.y })
            pathEnd.unshift({ x: bottom.x, y: bottom.y - 5 })
        } else { console.error("bad parameters", top, left, bottom, right); return; }

        let midpoint = {
            x: (pathStart[pathStart.length - 1].x + pathEnd[0].x) / 2,
            y: (pathStart[pathStart.length - 1].y + pathEnd[0].y) / 2,
        }

        // TODO: make better lines

        path = pathStart.concat(pathEnd);

        // draw the tails
        ctx.save();
        ctx.moveTo(path[0].x, path[0].y);
        ctx.beginPath();
        path.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.restore();

        return midpoint;
    }

    function highlightBoundingBox(box) {
        intfCtx.save();
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.setLineDash([5 / mScale, 10 / mScale]);
        intfCtx.strokeStyle = "grey";
        intfCtx.beginPath();
        intfCtx.rect(box.x, box.y, box.width, box.height);
        intfCtx.stroke();
        intfCtx.restore();
    }

    function drawSpine(spine) {
        intfCtx.save();
        intfCtx.setLineDash([5 / mScale, 10 / mScale]);
        intfCtx.beginPath();
        spine.forEach(p => {
            intfCtx.lineTo(p.x, p.y)
        });
        intfCtx.strokeStyle = "white";
        intfCtx.lineWidth = 4 / mScale;
        intfCtx.stroke();
        intfCtx.strokeStyle = "blue";
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.stroke();
        intfCtx.restore();
    }

    function drawSelectionBubble(path, color) {
        intfCtx.save();
        intfCtx.setLineDash([5 / mScale, 10 / mScale]);
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.globalCompositeOperation = "destination-over"
        intfCtx.fillStyle = color;
        intfCtx.beginPath();
        path.forEach(p => {
            intfCtx.lineTo(p.x, p.y)
        });
        intfCtx.lineTo(path[0].x, path[0].y)
        intfCtx.stroke();
        intfCtx.fill();
        intfCtx.restore();
    }

    return {
        reset,
        resetInterface,
        drawContainerRect,
        drawTextContainerRect,
        highlightContainerRect,
        highlightCircle,
        drawContainerRectSplitInteraction,
        drawLetterCircle,
        drawColorCircle,
        drawChannelIconCircle,
        drawThumbnailCircle,
        drawLines,
        drawStroke,
        drawInterfaceStroke,
        drawConnector,
        drawLink,
        drawBubble,
        highlightBubble,
        highlightLink,
        getTrianglePointer,
        highlightBoundingBox,
        drawSpine,
        drawSelectionBubble,
    }
}
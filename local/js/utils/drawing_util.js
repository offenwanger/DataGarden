function DrawingUtil(context, interactionContext, interfaceContext) {
    let ctx = context;
    let intCtx = interactionContext;
    let intfCtx = interfaceContext;

    // scale agnostic values
    const TARGET_INCREASE = 20;
    let mScale = 1;
    let mXTranslate = 0;

    function reset(zoomTransform) {
        ctx.reset();
        ctx.translate(zoomTransform.x, zoomTransform.y)
        ctx.scale(zoomTransform.k, zoomTransform.k)

        intCtx.reset();
        intCtx.translate(zoomTransform.x, zoomTransform.y)
        intCtx.scale(zoomTransform.k, zoomTransform.k)
        intCtx.imageSmoothingEnabled = false;

        mXTranslate = zoomTransform.x;
        mScale = zoomTransform.k;
    }

    function resetInterface(zoomTransform) {
        intfCtx.reset();
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
        } else if (channelType == ChannelType.ANGLE) {
            img = ImageDrawingUtil.angleChannelImage;
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

    function drawThumbnailCircle({ strokes, cx, cy, r, shadow = false, outline = null, code = null }) {
        const PADDING_SCALE = 0.7;
        const MIN_PIXELS = 1;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);

        if (outline) {
            ctx.lineWidth = 5;
            ctx.strokeStyle = outline;
            ctx.stroke();
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.stroke();

        ctx.fillStyle = 'white';
        if (shadow) {
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
        }
        ctx.fill();
        ctx.restore();

        ctx.save();
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

        // Interaction //
        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.arc(cx, cy, r, 0, 2 * Math.PI);
            intCtx.fill();
            intCtx.restore();
        }
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

    function drawBubble(outline, pointer, color, alpha, code) {
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

        if (pointer) {
            let middle = VectorUtil.average([...outline]);
            let radius = VectorUtil.dist(middle, outline.reduce((max, next) => VectorUtil.dist(middle, next) > VectorUtil.dist(middle, max) ? next : max, outline[0]));
            let pointerDirection = VectorUtil.normalize(VectorUtil.subtract(pointer, middle));
            let p1 = VectorUtil.add(VectorUtil.scale({ x: -pointerDirection.y, y: pointerDirection.x }, radius), middle);
            let p2 = VectorUtil.add(VectorUtil.scale({ x: pointerDirection.y, y: -pointerDirection.x }, radius), middle);
            let midpoint = { x: middle.x * 0.9 + pointer.x * 0.1, y: middle.y * 0.9 + pointer.y * 0.1 };
            ctx.moveTo(middle.x, middle.y);
            ctx.bezierCurveTo(p1.x, p1.y, midpoint.x, midpoint.y, pointer.x, pointer.y);
            ctx.bezierCurveTo(midpoint.x, midpoint.y, p2.x, p2.y, middle.x, middle.y);
        }

        ctx.fill('nonzero');
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

        let direction = VectorUtil.normalize(VectorUtil.subtract(end, start));
        let triangleBase = VectorUtil.add(start, VectorUtil.scale(direction, r));

        return [
            VectorUtil.add(triangleBase, VectorUtil.scale({ y: -direction.x, x: direction.y }, size / 2)),
            VectorUtil.add(triangleBase, VectorUtil.scale({ y: direction.x, x: -direction.y }, size / 2)),
            VectorUtil.add(triangleBase, VectorUtil.scale(direction, size))
        ]
    }

    function drawStroke({ path, color, width, shadow = false, outline = null, code = null }) {
        ctx.save();
        ctx.beginPath();
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        path.forEach(p => {
            ctx.lineTo(p.x, p.y);
        });

        if (outline) {
            ctx.lineWidth = 5;
            ctx.strokeStyle = outline;
            ctx.stroke();
        }

        if (shadow) {
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();

        ctx.restore();

        if (code) {
            intCtx.save();
            intCtx.strokeStyle = code;
            intCtx.lineWidth = width + TARGET_INCREASE / mScale;
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

    function drawRoot(root, position) {
        intfCtx.save();
        intfCtx.beginPath();
        intfCtx.arc(root.x, root.y, 5, 0, 2 * Math.PI);
        intfCtx.strokeStyle = "white";
        intfCtx.lineWidth = 4 / mScale;
        intfCtx.stroke();
        intfCtx.strokeStyle = "green";
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.stroke();

        if (position) {
            intfCtx.setLineDash([5 / mScale, 5 / mScale]);
            intfCtx.beginPath();
            intfCtx.moveTo(root.x, root.y)
            intfCtx.lineTo(position.x, position.y)
            intfCtx.strokeStyle = "white";
            intfCtx.lineWidth = 2 / mScale;
            intfCtx.stroke();
            intfCtx.strokeStyle = "green";
            intfCtx.lineWidth = 1 / mScale;
            intfCtx.stroke();
        }

        intfCtx.restore();
    }

    function drawAngle(root, angle) {
        let length = 20;
        let arrowLength = 5;
        let point = VectorUtil.add(root, VectorUtil.scale(angle, length));
        intfCtx.save();
        intfCtx.beginPath();
        intfCtx.moveTo(root.x, root.y);
        intfCtx.lineTo(point.x, point.y);

        let arrow1 = VectorUtil.add(point, VectorUtil.scale(VectorUtil.rotate(angle, Math.PI * 0.75), arrowLength));
        intfCtx.moveTo(arrow1.x, arrow1.y);
        intfCtx.lineTo(point.x, point.y);

        let arrow2 = VectorUtil.add(point, VectorUtil.scale(VectorUtil.rotate(angle, -Math.PI * 0.75), arrowLength));
        intfCtx.moveTo(arrow2.x, arrow2.y);
        intfCtx.lineTo(point.x, point.y);

        intfCtx.strokeStyle = "white";
        intfCtx.lineWidth = 4 / mScale;
        intfCtx.stroke();
        intfCtx.strokeStyle = "red";
        intfCtx.lineWidth = 2 / mScale;
        intfCtx.stroke();
        intfCtx.restore();
    }


    function drawInterfaceSelectionBubble(path, color) {
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

    function drawBand(color, y1, y2) {
        ctx.save();

        ctx.scale(1 / mScale, 1);
        ctx.translate(-mXTranslate, 0)

        ctx.fillStyle = color;
        ctx.rect(0, y1, 3000, y2 - y1);

        ctx.fill();

        ctx.restore();
    }

    const TEXT_HORIZONTAL_PADDING = 10;
    const TEXT_FONT_STRING = "px Segoe Print";
    const TEXT_SHRINK = 0.8;
    function drawStringNode({ x, y, label, height, shadow = false, outline = null, code = null, background = 'white' }) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, measureStringNode(label, height), height);

        if (outline) {
            ctx.lineWidth = 5;
            ctx.strokeStyle = outline;
            ctx.stroke();
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.stroke();
        if (shadow) {
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
        }
        ctx.fillStyle = background;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left'
        ctx.font = Math.round(height * TEXT_SHRINK) + TEXT_FONT_STRING;
        ctx.fillText(label, x + TEXT_HORIZONTAL_PADDING, y + height / 2);

        ctx.restore();

        if (code) {
            intCtx.save();
            intCtx.fillStyle = code;
            intCtx.beginPath();
            intCtx.rect(x, y, measureStringNode(label, height), height);
            intCtx.fill();
            intCtx.restore();
        }
    }

    function measureStringNode(text, height) {
        ctx.save();
        ctx.font = Math.round(height * TEXT_SHRINK) + TEXT_FONT_STRING;
        let width = ctx.measureText(text).width + TEXT_HORIZONTAL_PADDING * 2;
        ctx.restore();
        return width;
    }

    const LABEL_FONT_HEIGHT = 10;
    function drawAxis({ start, end, startLabel, endLabel }) {
        ctx.save();
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left'
        ctx.font = LABEL_FONT_HEIGHT + TEXT_FONT_STRING;
        ctx.fillText(startLabel, start.x, start.y);
        ctx.fillText(endLabel, end.x, end.y);
        ctx.restore();
    }

    function drawLinkLine({ start, end }) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.setLineDash([5 / mScale, 10 / mScale]);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2 / mScale;
        ctx.stroke();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1 / mScale;
        ctx.stroke();
        ctx.restore();
    }

    function drawCircleTarget({ cx, cy, r, code }) {
        intCtx.save();
        intCtx.fillStyle = code;
        intCtx.beginPath();
        intCtx.arc(cx, cy, r, 0, 2 * Math.PI);
        intCtx.fill();
        intCtx.restore();
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
        drawRoot,
        drawAngle,
        drawInterfaceSelectionBubble,
        drawBand,
        drawStringNode,
        measureStringNode,
        drawAxis,
        drawLinkLine,
        drawCircleTarget,
    }
}
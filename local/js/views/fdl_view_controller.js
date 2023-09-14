
function FdlViewController() {
    const DRAG_ELEMENT = "draggingElement";
    const DRAG_LINK = "dragging link";
    const DRAG_SELECT = "selectDrag";

    const TARGET_LINK = 'linkTarget';
    const TARGET_ELEMENT = 'elementTarget';

    const ELEMENT_PADDING = 10;

    let mCanvas = d3.select('#fdl-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#fdl-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#fdl-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);
    let mDrawingUtil = new DrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d"),
        mInterfaceCanvas.node().getContext("2d"),
    );

    let mHighlightCallback = () => { };
    let mParentElementCallback = () => { };
    let mHighlightElementIds = null;
    let mHighlightLink = null;
    let mSelectedElements = null;

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 1;

    let mZoomTransform = d3.zoomIdentity;

    let mModel = new DataModel();
    let mData = { "nodes": [], "links": [] };
    let mWidth = 100;
    let mHeight = 100;
    const ctx = mCanvas.node().getContext("2d");
    const ctx2 = mInteractionCanvas.node().getContext("2d");
    const simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(mWidth / 2, mHeight / 2))
        .on("tick", draw);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    let mInteraction = null;

    function onModelUpdate(model) {
        mModel = model;
        let elements = mModel.getElements();
        mData = { nodes: [], links: [] };
        elements.forEach(element => {
            mData.nodes.push({ "id": element.id, hasParent: element.parentId ? true : false, "group": 1 })
            if (element.parentId) {
                mData.links.push({ "source": element.parentId, "target": element.id, "value": 1 })
            }
        });

        // Redefine and restart simulation
        simulation.nodes(mData.nodes);
        simulation.force("link").links(mData.links);
        simulation.alpha(0.3).restart();

        drawInterface();
    }

    function onPointerDown(screenCoords, toolState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect()))
            return false;

        if (toolState == Buttons.PANNING_BUTTON) {
            mInteraction = {
                x: mZoomTransform.x,
                y: mZoomTransform.y,
                scale: mZoomTransform.k,
                screenCoords,
            }
            return true;
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            let target = getInteractionTarget(screenCoords);
            if (target && target.type == TARGET_ELEMENT) {
                console.log(target)
                let node = mData.nodes.find(n => n.id == target.id);
                mInteraction = { type: DRAG_ELEMENT, node };
                node.fx = node.x;
                node.fy = node.y;
                simulation.alphaTarget(0.3).restart();
            } else if (target && target.type == TARGET_LINK) {
                // show the link being dragged
                console.log("dragging link!")
                mInteraction = { type: DRAG_LINK, id: target.id };
            } else if (!target) {
                mInteraction = { type: DRAG_SELECT }
            } else {
                console.error("Invalid state!", target);
            }
            drawInterface();
        } else if (toolState == Buttons.ZOOM_BUTTON) {

            let zoomCenter = screenToModelCoords(screenCoords)
            mInteraction = {
                pointerX: zoomCenter.x,
                pointerY: zoomCenter.y,
                transformX: mZoomTransform.x,
                transformY: mZoomTransform.y,
                scale: mZoomTransform.k,
                screenCoords,
            }

            return true;
        }
    }

    function onPointerMove(screenCoords, toolState) {
        if (toolState == Buttons.PANNING_BUTTON && mInteraction) {
            let mouseDist = MathUtil.subtract(screenCoords, mInteraction.screenCoords);
            let translate = MathUtil.add(mInteraction, mouseDist);
            mZoomTransform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mInteraction.scale);

            draw();
            drawInterface();
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            let coords = screenToModelCoords(screenCoords);
            if (mInteraction && mInteraction.type == DRAG_ELEMENT) {
                mInteraction.node.fx = coords.x;
                mInteraction.node.fy = coords.y;
            } else if (mInteraction && mInteraction.type == DRAG_LINK) {
                console.log("Show link dragging!")
            } else if (!mInteraction) {
                if (!ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
                    let target = getInteractionTarget(screenCoords);
                    if (target && target.type == TARGET_ELEMENT) {
                        mHighlightLink = null;
                        mHighlightElementIds = [target.id];
                        mHighlightCallback(mHighlightElementIds);
                    } else if (target && target.type == TARGET_LINK) {
                        mHighlightElementIds = null;
                        mHighlightLink = mData.links.find(l => l.target.id == target.id);
                        if (!mHighlightLink) {
                            mHighlightLink = { source: null, target: mData.nodes.find(n => n.id == target.id) };
                        }
                        console.log(target, mHighlightLink)
                        drawInterface();
                    } else {
                        mHighlightElementIds = null;
                        mHighlightLink = null;
                        mHighlightCallback(null);
                    }
                }
                drawInterface();
            }
        } else if (toolState == Buttons.ZOOM_BUTTON && mInteraction) {
            let mouseDist = screenCoords.y - mInteraction.screenCoords.y;
            let scale = mInteraction.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
            let zoomChange = scale - mInteraction.scale;
            let transformX = -(mInteraction.pointerX * zoomChange) + mInteraction.transformX;
            let transformY = -(mInteraction.pointerY * zoomChange) + mInteraction.transformY;
            mZoomTransform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
            draw();
            drawInterface();
        }
    }

    function onPointerUp(screenCoords, toolState) {
        let interaction = mInteraction;
        mInteraction = null;
        if (interaction && interaction.type == DRAG_ELEMENT) {
            // Do something with this. 
        } else if (interaction && interaction.type == DRAG_LINK) {
            let target = getInteractionTarget(screenCoords);
            if (target && target.type == TARGET_ELEMENT) {
                console.log(interaction)
                mParentElementCallback(interaction.id, target.id);
            }
        }

        if (interaction && (toolState == Buttons.ZOOM_BUTTON || toolState == Buttons.PANNING_BUTTON)) {
            draw();
        }
    }

    function onResize(width, height) {
        d3.select("#fdl-view")
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

        mWidth = width;
        mHeight = height;

        draw();
        drawInterface();
    }

    function highlight(ids) {
        if (!ids || (Array.isArray(ids) && ids.length == 0)) {
            mHighlightElementIds = null;
        } else {
            mHighlightElementIds = ids.filter(id => IdUtil.isType(id, Data.Element));
            mHighlightElementIds.push(...ids.filter(id => IdUtil.isType(id, Data.Group)).map(groupId => mModel.getGroup(groupId).elements.map(e => e.id)).flat());
            mHighlightElementIds.push(...ids.filter(id => IdUtil.isType(id, Data.Stroke)).map(sId => mModel.getElementForStroke(sId).id));
            mHighlightElementIds = mHighlightElementIds.filter((elementId, index, self) => self.findIndex(id => id == elementId) == index);
        }
        drawInterface();
    }

    function draw() {
        mDrawingUtil.reset(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);
        mDrawingUtil.drawLines(mData.links.map(link => [link.source, link.target]), "#999", 0.6);
        mData.links.forEach(link => {
            mDrawingUtil.drawLink(link.source, link.target, 5, "#999", 0.6, getCode(link.target.id, TARGET_LINK));
        })

        mData.nodes.forEach(node => {
            if (!node.hasParent) {
                mDrawingUtil.drawLink(null, node, 5, "#999", 0.6, getCode(node.id, TARGET_LINK));
            }
            mDrawingUtil.drawColorCircle(node.x, node.y, 5, color(node.group), getCode(node.id, TARGET_ELEMENT));
        });

        drawInterface();
    }


    // interface is separate so we can redraw highlights without redrawing everything
    function drawInterface() {
        mDrawingUtil.resetInterface(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);
        if (mHighlightElementIds) {
            mHighlightElementIds.forEach(eId => {
                let e = mData.nodes.find(n => n.id == eId);
                mDrawingUtil.highlightCircle(e.x, e.y, 6, "#FF0000");
            })
        }
        if (mHighlightLink) {
            mDrawingUtil.highlightLink(mHighlightLink.source, mHighlightLink.target, 5, "#FF0000");
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
        if (ValUtil.checkConvertionState(screenCoords, boundingBox, zoomPan)) {
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

    function getCode(itemId, type) {
        if (mReverseInteractionLookup[itemId + "_" + type]) return mReverseInteractionLookup[itemId + "_" + type];
        else {
            let code = DataUtil.numToColor(mColorIndex++);
            mInteractionLookup[code] = { id: itemId, type };
            mReverseInteractionLookup[itemId + "_" + type] = code;
            return code;
        }
    }

    // Add a drag behavior. The _subject_ identifies the closest node to the pointer,
    // conditional on the distance being less than 20 pixels.
    // d3.select(canvas)
    //     .call(d3.drag()
    //         .subject(event => {
    //             const [px, py] = d3.pointer(event, canvas);
    //             return d3.least(nodes, ({ x, y }) => {
    //                 const dist2 = (x - px) ** 2 + (y - py) ** 2;
    //                 if (dist2 < 400) return dist2;
    //             });
    //         })
    //         .on("start", dragstarted)
    //         .on("drag", dragged)
    //         .on("end", dragended));

    // Reheat the simulation when drag starts, and fix the subject position.
    function dragstarted(event) {
    }

    // Update the subject (dragged node) position during drag.
    function dragged(event) {
    }

    // Restore the target alpha so the simulation cools after dragging ends.
    // Unfix the subject position now that it’s no longer being dragged.
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }


    return {
        onModelUpdate,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onResize,
        highlight,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setParentElementCallback: (func) => mParentElementCallback = func,
    }
}
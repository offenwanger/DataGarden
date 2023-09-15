
function FdlViewController() {
    const DRAG_ELEMENT = "draggingElement";
    const DRAG_LINK = "dragging link";
    const DRAG_SELECT = "selectDrag";

    const TARGET_LINK = 'linkTarget';
    const TARGET_ELEMENT = 'elementTarget';

    const ELEMENT_PADDING = 10;
    const NODE_SIZE = 8;

    let mShowGroups = true;
    let mShowLinks = true;

    d3.select(document).on('keypress', function (e) {
        if (e.key == 't') {
            mShowGroups = !mShowGroups;
            simulation.alpha(0.1).restart();
        }
        if (e.key == 'y') {
            if (mShowLinks) {
                simulation.force("link").links([]);
            } else {
                simulation.force("link").links(mData.links);
            }
            mShowLinks = !mShowLinks;
            simulation.alpha(0.1).restart();
        }
    });

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
    let mWidth = window.innerWidth / 2;
    let mHeight = window.innerHeight;
    let mClusterMap = {};
    let mColorMap = d3.scaleOrdinal(d3.schemeCategory10);

    // const simulation = d3.forceSimulation()
    //    .force("link", d3.forceLink().id(d => d.id))
    //     .force("charge", d3.forceManyBody())
    //     .force("center", d3.forceCenter(mWidth / 2, mHeight / 2))
    //     .on("tick", draw);
    const simulation = d3.forceSimulation()
        .force("center", d3.forceCenter().x(mWidth / 2).y(mHeight / 2))
        .force("collide", d3.forceCollide((d) => d.radius + padding))
        .force("link", d3.forceLink().id(d => d.id))
        .nodes(mData.nodes, (d) => d.id)
        .alpha(0.3)
        .on("tick", () => {
            if (mShowGroups) mData.nodes.forEach(cluster(0.2));
            mData.nodes.forEach(collide(0.2));
            draw();
        })
        .restart();

    let mInteraction = null;

    function onModelUpdate(model) {
        mModel = model;
        let elements = mModel.getElements();
        let oldData = mData;
        mData = { nodes: [], links: [] };
        elements.forEach(element => {
            let oldNode = oldData.nodes.find(n => n.id == element.id);
            mData.nodes.push({
                id: element.id,
                hasParent: element.parentId ? true : false,
                cluster: mModel.getGroupForElement(element.id).id,
                radius: NODE_SIZE,
                x: oldNode ? oldNode.x : mWidth / 2,
                y: oldNode ? oldNode.y : mHeight / 2,
            })

            if (element.parentId) {
                mData.links.push({
                    source: element.parentId,
                    target: element.id,
                    value: 1
                })
            }
        });

        mClusterMap = {};
        mData.nodes.forEach(n => {
            if (!mClusterMap[n.cluster]) mClusterMap[n.cluster] = n;
        });

        mColorMap = mColorMap.domain(Object.keys(mClusterMap));

        // Redefine and restart simulation
        simulation.nodes(mData.nodes);
        simulation.force("link").links(mData.links);
        simulation.alpha(0.3).restart();

        drawInterface();
    }

    let width = window.innerWidth / 2;
    let height = window.innerHeight;
    let padding = 5
    let clusterPadding = 20
    let maxRadius = 10

    function hullPoints(data) {
        let pointArr = [];
        const padding = 2.5;
        data.forEach(d => {
            const pad = d.radius + padding;
            pointArr = pointArr.concat([
                [d.x - pad, d.y - pad],
                [d.x - pad, d.y + pad],
                [d.x + pad, d.y - pad],
                [d.x + pad, d.y + pad]
            ]);
        });
        return pointArr;
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
            simulation.alphaTarget(0);
            interaction.node.fx = null;
            interaction.node.fy = null;
        } else if (interaction && interaction.type == DRAG_LINK) {
            let target = getInteractionTarget(screenCoords);
            if (target && target.type == TARGET_ELEMENT) {
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

        if (mShowGroups) {
            Object.keys(mClusterMap).forEach((cluster) => {
                if (cluster != 0) {
                    let clusterNodes = mData.nodes.filter((n) => n.cluster == cluster);
                    let hull = d3.polygonHull(hullPoints(clusterNodes)).map(p => { return { x: p[0], y: p[1] } });
                    mDrawingUtil.drawBubble(hull, mColorMap(cluster), 0.4)
                }
            })
        }

        if (mShowLinks) {
            mDrawingUtil.drawLines(mData.links.map(link => [link.source, link.target]), "#999", 0.6);
            mData.links.forEach(link => {
                mDrawingUtil.drawLink(link.source, link.target, 5, "#999", 0.6, getCode(link.target.id, TARGET_LINK));
            })

        }

        mData.nodes.forEach(node => {
            if (!node.hasParent && mShowLinks) {
                mDrawingUtil.drawLink(null, node, 5, "#999", 0.6, getCode(node.id, TARGET_LINK));
            }
            mDrawingUtil.drawColorCircle(node.x, node.y, node.radius, mColorMap(node.cluster), getCode(node.id, TARGET_ELEMENT));
        });

        drawInterface();
    }


    // interface is separate so we can redraw highlights without redrawing everything
    function drawInterface() {
        mDrawingUtil.resetInterface(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);
        if (mHighlightElementIds) {
            mHighlightElementIds.forEach(eId => {
                let e = mData.nodes.find(n => n.id == eId);
                mDrawingUtil.highlightCircle(e.x, e.y, NODE_SIZE, "#FF0000");
            })
        }
        if (mHighlightLink) {
            mDrawingUtil.highlightLink(mHighlightLink.source, mHighlightLink.target, NODE_SIZE, "#FF0000");
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

    function cluster(alpha) {
        // https://bl.ocks.org/mbostock/7881887
        return function (d) {
            const cluster = mClusterMap[d.cluster];
            if (cluster === d || d.cluster == 0) return;
            let x = d.x - cluster.x,
                y = d.y - cluster.y,
                l = Math.sqrt(x * x + y * y),
                r = d.radius + cluster.radius + 3;
            if (l != r) {
                l = (l - r) / l * alpha;
                d.x -= x *= l;
                d.y -= y *= l;
                cluster.x += x;
                cluster.y += y;
            }
        };
    }

    function collide(alpha) {
        // https://bl.ocks.org/mbostock/7882658
        const quadtree = d3.quadtree()
            .x(function (d) { return d.x; })
            .y(function (d) { return d.y; })
            .extent([[0, 0], [width, height]])
            .addAll(mData.nodes);
        return function (d) {
            let r = d.radius + (maxRadius * 8) + Math.max(padding, clusterPadding),
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function (quad, x1, y1, x2, y2) {
                let data = quad.data;
                if (data && data !== d) {
                    let x = d.x - data.x,
                        y = d.y - data.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + data.radius + (d.cluster == data.cluster ? padding : clusterPadding);
                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        data.x += x;
                        data.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
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
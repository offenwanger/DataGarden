
function FdlViewController() {
    const DRAG_NODE = "draggingNode";
    const DRAG_LINK = "draggingLink";
    const DRAG_BUBBLE = 'draggingBubble'
    const DRAG_SELECT = "selectDrag";

    const TARGET_LINK = 'linkTarget';
    const TARGET_NODE = 'elementTarget';
    const TARGET_BUBBLE = 'bubbleTarget';

    const ELEMENT_NODE_SIZE = 8;
    const STROKE_NODE_SIZE = 6;
    const DIMENTION_NODE_SIZE = 15;
    const MAX_RADIUS = DIMENTION_NODE_SIZE;

    const CLUSTER_PADDING = 20
    const NODE_PADDING = 5

    let mShowGroups = true;
    let mShowLinks = true;
    let mRunningSimulation = true;

    let mHighlightObjects = [];
    let mExplodedElements = [];
    let mHighlightLink = null;

    let mInteraction = null;

    let mHighlightCallback = () => { };
    let mParentElementCallback = () => { };
    let mMergeElementCallback = () => { };
    let mNewElementCallback = () => { }
    let mMoveElementCallback = () => { }
    let mMoveStrokeCallback = () => { }
    let mNewGroupCallback = () => { }

    let mModel = new DataModel();

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 10000;

    let mZoomTransform = d3.zoomIdentity;
    let mWidth = window.innerWidth / 2;
    let mHeight = window.innerHeight;

    let mData = { nodes: [], links: [], clusters: {} };
    let mColorMap = d3.scaleOrdinal(d3.schemeCategory10);

    let mCanvas = d3.select('#fdl-view').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#fdl-view").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#fdl-view").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);
    let mSimulation = d3.forceSimulation()
        .force("center", d3.forceCenter().x(mWidth / 2).y(mHeight / 2))
        .force("collide", d3.forceCollide((d) => d.radius + NODE_PADDING))
        .force("link", d3.forceLink().id(d => d.id))
        .nodes(mData.nodes, (d) => d.id)
        .alpha(0.3)
        .on("tick", () => {
            if (mShowGroups) mData.nodes.forEach(cluster(0.2));
            mData.nodes.forEach(collide(0.2));
            draw();
        })
        .restart();

    let mDrawingUtil = new DrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d"),
        mInterfaceCanvas.node().getContext("2d"),
    );

    function onModelUpdate(model) {
        mModel = model;

        mHighlightObjects = mHighlightObjects.filter(id => IdUtil.isType(id, Data.Element) ? mModel.getElement(id) : mModel.getStroke(id));
        mHighlightLink = null

        setupSimulation();
        triggerDraw(0.3);
    }

    function setupSimulation() {
        let oldData = mData;
        mData = { nodes: [], links: [], clusters: {} };
        mModel.getElements().forEach(element => {
            if (mExplodedElements.includes(element.id)) {
                let group = mModel.getGroupForElement(element.id).id;
                element.strokes.forEach(stroke => {
                    let oldNode = oldData.nodes.find(n => n.id == stroke.id);
                    if (!oldNode) oldNode = oldData.nodes.find(n => n.id == element.id);
                    let node = {
                        id: stroke.id,
                        isStroke: true,
                        clusters: [group, element.id],
                        radius: STROKE_NODE_SIZE,
                        x: oldNode ? oldNode.x : mWidth / 2,
                        y: oldNode ? oldNode.y : mHeight / 2,
                    }
                    mData.nodes.push(node);
                    node.clusters.forEach(cluster => {
                        if (!mData.clusters[cluster]) mData.clusters[cluster] = node;
                    })
                })
            } else {
                let oldNode = oldData.nodes.find(n => n.id == element.id);
                let node = {
                    id: element.id,
                    hasParent: element.parentId ? true : false,
                    clusters: [mModel.getGroupForElement(element.id).id],
                    radius: ELEMENT_NODE_SIZE,
                    x: oldNode ? oldNode.x : mWidth / 2,
                    y: oldNode ? oldNode.y : mHeight / 2,
                }
                mData.nodes.push(node);
                if (!mData.clusters[node.clusters[0]]) mData.clusters[node.clusters[0]] = node;
                if (element.parentId) {
                    mData.links.push({
                        source: element.parentId,
                        target: element.id,
                        value: 1
                    })
                }
            }
        });

        mModel.getDimentions().forEach(dimention => {
            let oldNode = oldData.nodes.find(n => n.id == dimention.id);
            let node = {
                id: dimention.id,
                radius: DIMENTION_NODE_SIZE,
                clusters: [],
                x: oldNode ? oldNode.x : mWidth / 2,
                y: oldNode ? oldNode.y : mHeight / 2,
            }
            mData.nodes.push(node);
        });

        mModel.getGroups().forEach(group => {
            DataUtil.getMappings(group).forEach(mapping => {
                if (mData.clusters[group.id]) {
                    mData.links.push({
                        source: mapping.dimention,
                        target: mData.clusters[group.id].id,
                        value: 1
                    })
                }
            })
        });

        mColorMap = mColorMap.domain(Object.keys(mData.clusters));

        // Redefine and restart simulation
        mSimulation.nodes(mData.nodes);
        mSimulation.force("link").links(mData.links);
    }

    d3.select(document).on('keypress', function (e) {
        if (e.key == 't') {
            mShowGroups = !mShowGroups;
            triggerDraw(0.1);
        }

        if (e.key == 'y') {
            if (mShowLinks) {
                mSimulation.force("link").links([]);
            } else {
                mSimulation.force("link").links(mData.links);
            }
            mShowLinks = !mShowLinks;
            triggerDraw(0.1);
        }
    });

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
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            let target = getInteractionTarget(screenCoords);
            if (target && target.type == TARGET_NODE) {
                let node = mData.nodes.find(n => n.id == target.id);
                node.fx = node.x;
                node.fy = node.y;
                mInteraction = {
                    type: DRAG_NODE,
                    id: node.id,
                    node: node,
                };

                // do this syncronously to make sure the interaction target is gone.
                draw();
                if (mRunningSimulation) {
                    mSimulation.alphaTarget(0.3).restart();
                }
            } else if (target && target.type == TARGET_LINK) {
                // show the link being dragged
                mInteraction = { type: DRAG_LINK, id: target.id, mousePosition: screenToModelCoords(screenCoords) };
                mSimulation.stop();
            } else if (target && target.type == TARGET_BUBBLE) {
                mInteraction = {
                    type: DRAG_BUBBLE,
                    id: target.id,
                    start: screenCoords
                };
            } else if (!target) {
                mInteraction = { type: DRAG_SELECT }
            } else {
                console.error("Invalid state!", target);
            }
            drawInterface();
        }
    }

    function onDblClick(screenCoords, toolState) {
        // tool state doesn't really matter atm
        let target = getInteractionTarget(screenCoords);
        if (target && target.type == TARGET_NODE) {
            mExplodedElements.push(target.id);
            setupSimulation()
            triggerDraw(0.1);
        } else if (target && target.type == TARGET_BUBBLE) {
            mExplodedElements.splice(mExplodedElements.indexOf(target.id), 1);
            setupSimulation()
            triggerDraw(0.1);
        }
    }

    function onPointerMove(screenCoords, toolState) {
        if (toolState == Buttons.PANNING_BUTTON && mInteraction) {
            let mouseDist = MathUtil.subtract(screenCoords, mInteraction.screenCoords);
            let translate = MathUtil.add(mInteraction, mouseDist);
            mZoomTransform = d3.zoomIdentity.translate(translate.x, translate.y).scale(mInteraction.scale);

            draw();
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            let coords = screenToModelCoords(screenCoords);
            if (mInteraction && mInteraction.type == DRAG_NODE) {
                mInteraction.node.fx = coords.x;
                mInteraction.node.fy = coords.y;
                if (!mRunningSimulation) {
                    draw();
                }
            } else if (mInteraction && mInteraction.type == DRAG_LINK) {
                mInteraction.mousePosition = coords;
                draw();
            } else if (!mInteraction) {
                if (!ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
                    let target = getInteractionTarget(screenCoords);
                    if (target && target.type == TARGET_NODE) {
                        mHighlightLink = null;
                        mHighlightObjects = [target.id];
                        mHighlightCallback(mHighlightObjects);
                    } else if (target && target.type == TARGET_LINK) {
                        mHighlightObjects = [];
                        mHighlightLink = target.id;
                        drawInterface();
                    } else {
                        mHighlightObjects = [];
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
        }
    }

    function onPointerUp(screenCoords, toolState) {
        let interaction = mInteraction;
        mInteraction = null;
        if (interaction && interaction.type == DRAG_NODE) {
            interaction.node.fx = null;
            interaction.node.fy = null;
            if (mRunningSimulation) {
                mSimulation.alphaTarget(0);
            } else {
                let target = getInteractionTarget(screenCoords);
                if (target) {
                    if (IdUtil.isType(interaction.id, Data.Stroke) && IdUtil.isType(target.id, Data.Element)) {
                        if (mModel.getElementForStroke(target.id).id == target.id) {
                            interaction.node.x = coords.x;
                            interaction.node.y = coords.y;
                        } else {
                            mMoveStrokeCallback(target.id, interaction.id);
                        }
                    } else if (IdUtil.isType(interaction.id, Data.Stroke) && IdUtil.isType(target.id, Data.Group)) {
                        mNewElementCallback(target.id, interaction.id);
                    } else if (IdUtil.isType(interaction.id, Data.Element) && IdUtil.isType(target.id, Data.Element)) {
                        mMergeElementCallback([interaction.node.id], target.id);
                    } else if (IdUtil.isType(interaction.id, Data.Element) && IdUtil.isType(target.id, Data.Group)) {
                        if (mModel.getGroupForElement(interaction.id).id == target.id) {
                            let coords = screenToModelCoords(screenCoords);
                            interaction.node.x = coords.x;
                            interaction.node.y = coords.y;
                        } else {
                            mMoveElementCallback(target.id, interaction.id);
                        }
                    }
                } else {
                    mNewGroupCallback(interaction.id);
                }
                draw();
            }
        } else if (interaction && interaction.type == DRAG_LINK) {
            let target = getInteractionTarget(screenCoords);
            if (target && target.type == TARGET_NODE) {
                mParentElementCallback(interaction.id, target.id);
            }
            triggerDraw(0.3);
        } else if (interaction && interaction.type == DRAG_BUBBLE) {
            let motion = MathUtil.length(MathUtil.subtract(interaction.start, screenCoords))
            if (motion < 5 && IdUtil.isType(interaction.id, Data.Group)) {
                mContextItem = interaction.id;
                return { type: EventResponse.CONTEXT_MENU_GROUP, id: interaction.id }
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
    }

    function highlight(ids) {
        if (!ids || (Array.isArray(ids) && ids.length == 0)) {
            mHighlightObjects = [];
        } else {
            mHighlightObjects = ids.filter(id => IdUtil.isType(id, Data.Element));
            mHighlightObjects.push(...ids.filter(id => IdUtil.isType(id, Data.Group)).map(groupId => mModel.getGroup(groupId).elements.map(e => e.id)).flat());
            mHighlightObjects.push(...ids.filter(id => IdUtil.isType(id, Data.Stroke)).map(sId => mModel.getElementForStroke(sId).id));
            mHighlightObjects = mHighlightObjects.filter((elementId, index, self) => self.findIndex(id => id == elementId) == index);
        }
    }

    function pauseSimulation() {
        mRunningSimulation = false;
        mSimulation.stop();
    }

    function runSimulation() {
        mRunningSimulation = true;
        mSimulation.alphaTarget(0.3).restart();
    }

    function triggerDraw(alpha) {
        if (mRunningSimulation) {
            mSimulation.alpha(alpha).restart();
        } else {
            draw();
        }
    }

    function draw() {
        mDrawingUtil.reset(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);

        if (mShowGroups) {
            getOrderedClusters().forEach((c) => {
                let clusterNodes = mData.nodes.filter((n) => n.clusters.includes(c));
                let hull = d3.polygonHull(hullPoints(clusterNodes)).map(p => { return { x: p[0], y: p[1] } });
                mDrawingUtil.drawBubble(hull, mColorMap(cluster), 0.4, getCode(c, TARGET_BUBBLE));
            })
        }

        if (mShowLinks) {
            if (mInteraction && mInteraction.type == DRAG_LINK) {
                let pos;
                if (mExplodedElements.includes(mInteraction.id)) {
                    pos = MathUtil.average(mData.nodes.filter((n) => n.clusters.includes(mInteraction.id)))
                } else {
                    pos = mData.nodes.find(n => n.id == mInteraction.id);
                }
                mDrawingUtil.drawLines([[mInteraction.mousePosition, pos]], "#999", 0.6);
                mDrawingUtil.drawLink(mInteraction.mousePosition, pos, 0, "#999", 0.6);
            }

            let links = mData.links;
            if (mInteraction && mInteraction.type == DRAG_LINK) {
                links = links.filter(link => mInteraction.id != link.target.id);
            }

            mDrawingUtil.drawLines(links.map(link => [link.source, link.target]), "#999", 0.6);
            links.filter(l => IdUtil.isType(l.source.id, Data.Element)).forEach(link => {
                mDrawingUtil.drawLink(link.source, link.target, 5, "#999", 0.6, getCode(link.target.id, TARGET_LINK));
            })
        }

        mData.nodes.forEach(node => {
            // if we are dragging the link it was already drawn so don't do it again
            let linkIsDragged = mInteraction && mInteraction.type == DRAG_LINK && mInteraction.id == node.id;
            let nodeIsDragged = mInteraction && mInteraction.type == DRAG_NODE && mInteraction.id == node.id;
            if (IdUtil.isType(node.id, Data.Element) && !node.isStroke && !nodeIsDragged && !node.hasParent && mShowLinks && !linkIsDragged) {
                mDrawingUtil.drawLink(null, node, 5, "#999", 0.6, getCode(node.id, TARGET_LINK));
            }
            // if we are dragging don't draw the interaction target
            let code = (mInteraction && mInteraction.type == DRAG_NODE && mInteraction.node.id == node.id) ? null : getCode(node.id, TARGET_NODE);
            let { x, y } = node;
            if (!mRunningSimulation && nodeIsDragged) {
                x = node.fx;
                y = node.fy;
            }

            mDrawingUtil.drawColorCircle(x, y, node.radius, mColorMap(node.cluster), code);
        });

        drawInterface();
    }


    // interface is separate so we can redraw highlights without redrawing everything
    function drawInterface() {
        mDrawingUtil.resetInterface(mCanvas.attr("width"), mCanvas.attr("height"), mZoomTransform);
        mHighlightObjects.forEach(id => {
            if (IdUtil.isType(id, Data.Stroke)) {
                let node = mData.nodes.find(n => n.id == id);
                if (!node) {
                    let element = mModel.getElementForStroke(id);
                    if (!element) { console.error("Bad state! Highlighting non-existant node", id); return; }
                    node = mData.nodes.find(n => n.id == element.id);
                    if (!node) { console.error("Bad state! Highlighting non-existant node", element.id); return; }
                }
                mDrawingUtil.highlightCircle(node.x, node.y, node.radius, "#FF0000");
            } else if (mExplodedElements.includes(id)) {
                let clusterNodes = mData.nodes.filter((n) => n.clusters.includes(id));
                let hull = d3.polygonHull(hullPoints(clusterNodes)).map(p => { return { x: p[0], y: p[1] } });
                mDrawingUtil.highlightBubble(hull, "red");
            } else {
                if (mInteraction && mInteraction.type == DRAG_NODE && mInteraction.id == id) { return; }
                let node = mData.nodes.find(n => n.id == id);
                if (!node) { console.error("Bad state! Highlighting non-existant node", id); return; }
                mDrawingUtil.highlightCircle(node.x, node.y, node.radius, "#FF0000");
            }
        })

        if (mHighlightLink && (!mInteraction || mInteraction.type != DRAG_LINK)) {
            let target = mData.nodes.find(n => n.id == mHighlightLink);
            if (!target) {
                let clusterNodes = mData.nodes.filter((n) => n.clusters.includes(mHighlightLink));
                if (clusterNodes.length == 0) { console.error("Invalid link highlight target!", mHighlightLink); return; }
                target = MathUtil.average(clusterNodes);
            }

            let source = null;
            let element = mModel.getElement(mHighlightLink);
            if (!element) { console.error("invalid state, element not found", mHighlightLink); return; }
            if (element.parentId) {
                source = mData.nodes.find(n => n.id == element.parentId);
                if (!source) {
                    let clusterNodes = mData.nodes.filter((n) => n.clusters.includes(element.parentId));
                    if (clusterNodes.length == 0) { console.error("Invalid link highlight target!"); return; }
                    source = MathUtil.average(clusterNodes);
                }
            }

            mDrawingUtil.highlightLink(source, target, target.radius, "#FF0000");
        }
    }

    function getOrderedClusters() {
        return Object.keys(mData.clusters).sort((a, b) => {
            if (IdUtil.isType(a, Data.Element) && IdUtil.isType(b, Data.Group)) {
                return -1;
            } else if (IdUtil.isType(b, Data.Element) && IdUtil.isType(a, Data.Group)) {
                return 1
            } else return 0;
        })
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
            let code = DataUtil.numToColor(mColorIndex += 100);
            mInteractionLookup[code] = { id: itemId, type };
            mReverseInteractionLookup[itemId + "_" + type] = code;
            return code;
        }
    }

    function cluster(alpha) {
        // https://bl.ocks.org/mbostock/7881887
        return function (d) {
            d.clusters.forEach(c => {
                const clusterHeart = mData.clusters[c];
                if (clusterHeart === d || c == 0) return;
                let x = d.x - clusterHeart.x;
                let y = d.y - clusterHeart.y;
                let l = Math.sqrt(x * x + y * y);
                let r = d.radius + clusterHeart.radius + 3;
                // if they aren't at min dist
                if (l != r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    clusterHeart.x += x;
                    clusterHeart.y += y;
                }

            })
        };
    }

    function collide(alpha) {
        // https://bl.ocks.org/mbostock/7882658
        const quadtree = d3.quadtree()
            .x(function (d) { return d.x; })
            .y(function (d) { return d.y; })
            .extent([[0, 0], [mWidth, mHeight]])
            .addAll(mData.nodes);
        return function (d) {
            let r = d.radius + (MAX_RADIUS * 8) + Math.max(NODE_PADDING, CLUSTER_PADDING),
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
                        r = d.radius + data.radius + (d.clusters.some(c => { data.clusters.includes(c) }) ? NODE_PADDING : CLUSTER_PADDING);
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

    function hullPoints(data) {
        let pointArr = [];
        data.forEach(d => {
            const pad = d.radius + NODE_PADDING;
            pointArr = pointArr.concat([
                [d.x - pad, d.y - pad],
                [d.x - pad, d.y + pad],
                [d.x + pad, d.y - pad],
                [d.x + pad, d.y + pad]
            ]);
        });
        return pointArr;
    }

    return {
        onModelUpdate,
        onPointerDown,
        onDblClick,
        onPointerMove,
        onPointerUp,
        onResize,
        highlight,
        pauseSimulation,
        runSimulation,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setParentElementCallback: (func) => mParentElementCallback = func,
        setMergeElementCallback: (func) => mMergeElementCallback = func,
        setNewElementCallback: (func) => mNewElementCallback = func,
        setMoveElementCallback: (func) => mMoveElementCallback = func,
        setMoveStrokeCallback: (func) => mMoveStrokeCallback = func,
        setNewGroupCallback: (func) => mNewGroupCallback = func,
    }
}
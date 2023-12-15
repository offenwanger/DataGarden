function FdlParentViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap) {
    const TARGET_ELEMENT = 'element_target';
    const TARGET_BUBBLE = 'bubble_target'
    const TARGET_LOCK = "target_lock";

    const DIVISION_SIZE = Size.ELEMENT_NODE_SIZE * 10;

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mModel = new DataModel();
    // TODO: Actually check screen size on this
    let mZoomTransform = d3.zoomIdentity.translate(500, 300);

    let mTargetLock = null;
    let mDraggedNodes = [];

    let mParentUpdateCallback = () => { };

    let mNodes = [];
    let mLinks = [];
    let mSimulation = d3.forceSimulation()
        .alphaDecay(Decay.ALPHA)
        .velocityDecay(Decay.VELOCITY)
        .force("x", d3.forceX(0).strength(0.01))
        .force("collide", d3.forceCollide((d) => d.radius + Padding.NODE * 2))
        .force("link", d3.forceLink().id(d => d.id))
        .force("tree-level", d3.forceY((d => (d.treeLevel + 0.5) * DIVISION_SIZE)).strength(0.7))
        .alpha(0.3)
        .on("tick", () => {
            mNodes.forEach(node => {
                if (node.targetX && node.targetY) {
                    node.x += (node.targetX - node.x) * mSimulation.alpha();
                    node.y += (node.targetY - node.y) * mSimulation.alpha();
                }
            })
            draw();
        })
        .stop();

    function draw() {
        mDrawingUtil.reset(mZoomTransform);

        let levelCount = mNodes.reduce((max, n) => n.treeLevel > max ? n.treeLevel : max, 0) + 1;
        for (let i = 1; i < levelCount; i += 2) {
            let prevNodes = mNodes.filter(n => n.treeLevel == i - 1 && !n.interacting);
            let levelNodes = mNodes.filter(n => n.treeLevel == i && !n.interacting);
            let nextNodes = mNodes.filter(n => n.treeLevel == i + 1 && !n.interacting);

            let prevMax = prevNodes.reduce((max, { y }) => Math.max(max, y), -Infinity);
            let levelMin = levelNodes.reduce((min, { y }) => Math.min(min, y), Infinity);
            let top = (levelMin + prevMax) / 2;

            let levelMax = levelNodes.reduce((max, { y }) => Math.max(max, y), -Infinity);
            let nextMin = nextNodes.reduce((min, { y }) => Math.min(min, y), Infinity);
            if (nextMin == Infinity) nextMin = levelMax + Size.ELEMENT_NODE_SIZE * 2;
            let bottom = (nextMin + levelMax) / 2;

            mDrawingUtil.drawBand("lightgrey", top, bottom);
        }


        let elements = mNodes.map(n => mModel.getElement(n.id));
        let parents = DataUtil.unique(elements.map(e => e.parentId).filter(p => p));
        parents.forEach(parentId => {
            let draggedIds = mDraggedNodes.map(n => n.id);
            let clusterNodes = elements.filter(e => e.parentId == parentId).map(e => mNodes.find(n => n.id == e.id));
            if (clusterNodes.length == 0) { console.error("Invalid cluster, no nodes", c); return; }
            clusterNodes = clusterNodes.filter(n => !draggedIds.includes(n.id))
            if (clusterNodes.length == 0) return;
            let hull = d3.polygonHull(DataUtil.getPaddedPoints(clusterNodes, Padding.NODE)).map(p => { return { x: p[0], y: p[1] } });
            let parentNode = mNodes.find(n => n.id == parentId);
            mDrawingUtil.drawBubble({
                outline: hull,
                pointer: parentNode,
                color: mColorMap(parentId),
                alpha: 0.4,
                shadow: mHighlightIds.includes(parentId),
                code: draggedIds.includes(parentId) ? null : mCodeUtil.getCode(parentId, TARGET_BUBBLE)
            });
        })

        if (mTargetLock) {
            let targetNode = mNodes.find(n => n.id == mTargetLock);
            mDrawingUtil.drawCircleTarget({
                cx: targetNode.x,
                cy: targetNode.y,
                r: targetNode.radius * 3,
                code: mCodeUtil.getCode(mTargetLock, TARGET_LOCK)
            })
        }

        let draggedIds = mDraggedNodes.map(n => n.id);
        mNodes.filter(n => !draggedIds.includes(n.id)).forEach(node => drawNode(node, elements.find(e => e.id == node.id)));
        mDraggedNodes.forEach(node => drawNode(node, elements.find(e => e.id == node.id)))
    }

    function drawNode(node, element) {
        if (IdUtil.isType(node.id, Data.Element)) {
            mDrawingUtil.drawThumbnailCircle({
                strokes: element.strokes,
                cx: node.x,
                cy: node.y,
                r: node.radius,
                shadow: mHighlightIds.includes(node.id),
                outline: mSelectionIds.includes(node.id) ? mColorMap(node.id) : null,
                code: node.interacting ? null : mCodeUtil.getCode(node.id, TARGET_ELEMENT)
            });
        } else {
            console.error("Invalid state, this node not supported", node);
        }
    }

    function updateSimulationData(data, model) {
        mModel = model;

        mNodes = data.filter(i => IdUtil.isType(i.id, Data.Element));
        mSimulation.nodes(mNodes, (d) => d.id)

        mLinks = [];
        let elements = mNodes.map(n => mModel.getElement(n.id));
        elements.forEach(element => {
            if (element.parentId) mLinks.push({ source: element.id, target: element.parentId });
        });

        mSimulation.force("link").links(mLinks);
        mSimulation.alphaTarget(0.3).restart();
    }

    function onHighlight(highlightedIds) {
        if (!highlightedIds || !Array.isArray(highlightedIds)) { mHighlightIds = []; return; }
        mHighlightIds = DataUtil.unique(highlightedIds.map(id => {
            if (IdUtil.isType(id, Data.Stroke)) {
                let element = mModel.getElementForStroke(id);
                if (!element) { console.error("Bad state, element not found for stroke"); return id; }
                return element.id;
            } else {
                return id;
            }
        }));
    }

    function onSelection(selectedIds) {
        if (!selectedIds || !Array.isArray(selectedIds)) { mSelectionIds = []; return; }
        mSelectionIds = selectedIds;
    }

    function pan(x, y) {
        mZoomTransform = d3.zoomIdentity.translate(x, y).scale(mZoomTransform.k);
        draw();
    }

    function zoom(x, y, scale) {
        mZoomTransform = d3.zoomIdentity.translate(x, y).scale(scale);
        draw();
    }

    function interactionStart(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        mDraggedNodes = mNodes.filter(n => interaction.target.includes(n.id));
        mDraggedNodes.forEach(node => {
            node.startX = node.x;
            node.startY = node.y;
            node.interacting = true;
        });

        let remainingNodes = mNodes.filter(n => !interaction.target.includes(n.id));
        mSimulation.nodes(remainingNodes);
    }

    function interactionDrag(interaction, modelCoords) {
        if (interaction.type != FdlInteraction.SELECTION) { console.error("Interaction not supported!"); return; }
        if (interaction.mouseOverTarget) {
            if (interaction.mouseOverTarget.id == mTargetLock) {
                // do nothing
            } else if (interaction.mouseOverTarget.type == TARGET_ELEMENT) {
                mTargetLock = interaction.mouseOverTarget.id;
                let targetNode = mNodes.find(n => n.id == mTargetLock);
                mDraggedNodes.forEach(node => {
                    node.targetX = targetNode.x + Size.ELEMENT_NODE_SIZE * (1 - + Math.random() * 2);
                    node.targetY = targetNode.y + Size.ELEMENT_NODE_SIZE * (1 + Math.random());
                });
            }
        } else {
            mTargetLock = null;
        }

        if (!mTargetLock) {
            let dist = VectorUtil.subtract(modelCoords, interaction.start);
            mDraggedNodes.forEach(node => {
                node.targetX = node.startX + dist.x;
                node.targetY = node.startY + dist.y;
            });
        }
    }

    function interactionEnd(interaction, modelCoords) {
        if (interaction.type == FdlInteraction.SELECTION) {
            let dist = VectorUtil.subtract(modelCoords, interaction.start);
            mDraggedNodes.forEach(node => {
                if (!interaction.endTarget) {
                    node.x = node.startX + dist.x;
                    node.y = node.startY + dist.y;
                }
                node.startX = null;
                node.startY = null;
                node.targetX = null;
                node.targetY = null;
                node.interacting = null;
            });

            if (interaction.endTarget && IdUtil.isType(interaction.endTarget.id, Data.Element)) {
                mParentUpdateCallback(mDraggedNodes.map(n => n.id), interaction.endTarget.id);
            } else if (!interaction.endTarget) {
                if (modelCoords.y < Math.min(...mNodes.filter(n => n.treeLevel == 0).map(n => n.y))) {
                    mParentUpdateCallback(mDraggedNodes.map(n => n.id), null);
                }
            }

            mDraggedNodes = [];
            mTargetLock = null;
            mSimulation.nodes(mNodes);
        } else if (interaction.type == FdlInteraction.LASSO) {
            mOverlayUtil.reset(mZoomTransform);
            mOverlayUtil.drawBubble(interaction.path);
            let selectedNodes = mNodes.filter(node => mOverlayUtil.covered(node)).map(n => n.id);
            return selectedNodes;
        } else { console.error("Interaction not supported!"); return; }
    }

    function getScale() {
        return mZoomTransform.k;
    }

    function getTranslate() {
        return { x: mZoomTransform.x, y: mZoomTransform.y };
    }


    function getZoomTransform() {
        return {
            x: mZoomTransform.x,
            y: mZoomTransform.y,
            k: mZoomTransform.k,
        }
    }

    function start() {
        mSimulation.alphaTarget(0.3).restart();
    }

    function stop() {
        mSimulation.stop();
    }

    return {
        updateSimulationData,
        pan,
        zoom,
        interactionStart,
        interactionDrag,
        interactionEnd,
        onHighlight,
        onSelection,
        getScale,
        getTranslate,
        getZoomTransform,
        setParentUpdateCallback: (func) => mParentUpdateCallback = func,
        start,
        stop,
    }

}
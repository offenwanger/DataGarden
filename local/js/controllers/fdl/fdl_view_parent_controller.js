function FdlParentViewController(mDrawingUtil, mCodeUtil, mColorMap) {
    const TARGET_ELEMENT = 'elementTarget';

    let mHighlightElements = [];
    let mSelectedObjects = [];

    let mWidth = 0;
    let mHeight = 0;

    let mModel = new DataModel();
    let mZoomTransform = d3.zoomIdentity;

    let mParentUpdateCallback = () => { };

    let mNodes = [];
    let mLinks = [];
    let mSimulation = d3.forceSimulation()
        .force("x", d3.forceX(0).strength(0.01))
        .force("collide", d3.forceCollide((d) => d.radius + Padding.NODE))
        .force("link", d3.forceLink().id(d => d.id))
        .force("drift", () => mSimulation.nodes().forEach(d => SimulationUtil.drift(d, mSimulation.alpha())))
        .alpha(0.3)
        .on("tick", () => { draw(); })
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
            let clusterNodes = elements.filter(e => e.parentId == parentId).map(e => mNodes.find(n => n.id == e.id));
            if (clusterNodes.length == 0) { console.error("Invalid cluster, no nodes", c); return; }
            let hull = d3.polygonHull(DataUtil.getPaddedPoints(clusterNodes, Padding.NODE)).map(p => { return { x: p[0], y: p[1] } });
            let parentNode = mNodes.find(n => n.id == parentId);
            mDrawingUtil.drawBubble(hull, parentNode, mColorMap(parentId), 0.4);
        })

        mNodes.forEach(node => {
            if (IdUtil.isType(node.id, Data.Element)) {
                mDrawingUtil.drawThumbnailCircle(
                    elements.find(e => e.id == node.id).strokes,
                    node.x,
                    node.y,
                    node.radius,
                    node.interacting ? null : mCodeUtil.getCode(node.id, TARGET_ELEMENT));
            } else {
                console.error("Invalid state, this node not supported", node);
            }
        });

        drawInterface();
    }


    // interface is separate so we can redraw highlights without redrawing everything
    function drawInterface() {
        mDrawingUtil.resetInterface(mZoomTransform);
        mHighlightElements.forEach(id => {
            let node = mNodes.find(n => n.id == id);
            if (node) {
                mDrawingUtil.highlightCircle(node.x, node.y, node.radius, "#FF0000");
            }
        })
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

    function onResize(width, height) {
        mWidth = width;
        mHeight = height;

        draw();

        mSimulation.force("center", d3.forceCenter().x(mWidth / 2).y(mHeight / 2))
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
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetNodes = mNodes.filter(n => target.includes(n.id));
        let remainingNodes = mNodes.filter(n => !target.includes(n.id));
        targetNodes.forEach(node => {
            node.startX = node.x;
            node.startY = node.y;
            node.interacting = true;
        });

        mSimulation.nodes(remainingNodes);
    }

    function interactionDrag(interaction, modelCoords) {
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetNodes = mNodes.filter(n => target.includes(n.id));
        let dist = MathUtil.subtract(modelCoords, interaction.start);
        targetNodes.forEach(node => {
            node.x = node.startX + dist.x;
            node.y = node.startY + dist.y;
        });

    }

    function interactionEnd(interaction, modelCoords) {
        let target = (Array.isArray(interaction.target) ? interaction.target : [interaction.target])
            .map(target => target.id ? target.id : target);
        let targetNodes = mNodes.filter(n => target.includes(n.id));
        let dist = MathUtil.subtract(modelCoords, interaction.start);
        targetNodes.forEach(node => {
            node.startX = null;
            node.startY = null;
            node.interacting = null;
            if (!interaction.endTarget) {
                node.x = node.startX + dist.x;
                node.y = node.startY + dist.y;
            }
        });

        if (interaction.endTarget && IdUtil.isType(interaction.endTarget, Data.Element)) {
            mParentUpdateCallback(targetNodes.map(n => n.id), interaction.endTarget);
        } else if (!interaction.endTarget) {
            if (modelCoords.y < Math.min(...mNodes.filter(n => n.treeLevel == 0).map(n => n.y))) {
                mParentUpdateCallback(targetNodes.map(n => n.id), null);
            }
        }

        mSimulation.nodes(mNodes);
    }

    function highlight(ids) {
        if (Array.isArray(ids)) {
            mHighlightElements = ids.filter(id => IdUtil.isType(id, Data.Element));
        } else {
            mHighlightElements = [];
        }
    }

    function getScale() {
        return mZoomTransform.k;
    }

    function getTranslate() {
        return { x: mZoomTransform.x, y: mZoomTransform.y };
    }

    function stop() {
        mSimulation.stop();
    }

    return {
        updateSimulationData,
        onResize,
        pan,
        zoom,
        interactionStart,
        interactionDrag,
        interactionEnd,
        highlight,
        getScale,
        getTranslate,
        setParentUpdateCallback: (func) => mParentUpdateCallback = func,
        stop,
    }

}
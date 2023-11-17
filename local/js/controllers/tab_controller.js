function TabController() {
    let mCanvas = d3.select('#tabs-container').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInteractionCanvas = d3.select("#tabs-container").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mClickCallback = () => { };

    let mCodeUtil = new CodeUtil();

    let mInteraction = null;
    let mMousedOver = null;

    let mActiveTab = Tab.PARENT;
    let mDefaultTabs = [{
        title: "Parents",
        id: Tab.PARENT,
    }, {
        title: "Table",
        id: Tab.TABLE,
    }, {
        title: "Legend",
        id: Tab.LEGEND,
    }]
    let mDimentionTabs = [];

    let mTabDrawingUtil = new TabDrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d")
    );

    function onResize(width, height) {
        d3.select("#tabs-container")
            .style('width', width + "px")
            .style('height', height + "px");
        mCanvas
            .attr('width', width)
            .attr('height', height);
        mInteractionCanvas
            .attr('width', width)
            .attr('height', height);

        draw();
    }

    function onPointerDown(screenCoords, toolState) {
        let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
        if (target) {
            mInteraction = target;
        }
    }

    function onPointerMove(screenCoords, toolState) {
        if (!mInteraction) {
            let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            if (target) {
                mMousedOver = target;
                draw();
            } else {
                let wasMousedOver = mMousedOver;
                mMousedOver = null;
                if (wasMousedOver) {
                    draw();
                }
            }
        }
    }

    function onPointerUp(screenCoords, toolState) {
        let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
        if (target && target == mInteraction) {
            mClickCallback(target);
        }
        mInteraction = null;
    }


    function draw() {
        mTabDrawingUtil.reset();

        let canvasWidth = mCanvas.attr("width");
        let canvasHeight = mCanvas.attr("height");
        let tabHeight = Math.round(canvasHeight * 0.8);
        let topPadding = canvasHeight - tabHeight - 1;

        let tabs = mDefaultTabs.concat(mDimentionTabs)
        let tabWidth = canvasWidth / tabs.length;

        let activeTab = tabs.splice(tabs.findIndex(t => t.id == mActiveTab), 1);
        tabs.forEach((tab, index) => {
            if (tab.id != mActiveTab) {
                mTabDrawingUtil.drawTab((index + 1) * tabWidth, topPadding, tabWidth + 10, tabHeight, tab.title, tab.id == mMousedOver, mCodeUtil.getCode(tab.id));
            }
        })

        mTabDrawingUtil.drawHorizontalLine(canvasHeight - 2, canvasWidth, 2);

        if (!activeTab) { console.error("Invalid active tab!"); return; }
        activeTab = activeTab[0];
        mTabDrawingUtil.drawTab(0, topPadding, tabWidth + 10, tabHeight, activeTab.title, true, mCodeUtil.getCode(activeTab.id));
    }

    function setActiveTab(tabId) {
        mActiveTab = tabId;
        draw();
    }

    function addTab(id, title) {
        mDimentionTabs.push({ id, title });
        draw();
    }

    function removeTab(id) {
        mDimentionTabs.splice(mDimentionTabs.find(t => t.id == id), 1);
        draw();
    }

    return {
        onResize,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        setActiveTab,
        addTab,
        removeTab,
        setClickCallback: (func) => mClickCallback = func,
    }
}
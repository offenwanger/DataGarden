function TabController() {
    let mCanvas = d3.select('#tabs-container').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInteractionCanvas = d3.select("#tabs-container").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    const TAB_TARGET = "tab";
    const CLOSE_TARGET = "close";

    let mSetTabCallback = () => { };

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
    let mDimensionTabs = [];

    let mTabDrawingUtil = new TabDrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d")
    );

    function onModelUpdate(model) {
        mDimensionTabs.forEach(dimensionTab => {
            let dimension = model.getDimension(dimensionTab.id);
            if (dimension) {
                dimensionTab.title = dimension.name;
            } else {
                removeTab(dimensionTab.id);
            }
        })
        draw();
    }

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
                mMousedOver = target.id;
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
        if (target && target.id == mInteraction.id) {
            if (target.type == TAB_TARGET) {
                mSetTabCallback(target.id);
            } else if (target.type == CLOSE_TARGET) {
                removeTab(target.id);
                draw();
            } else {
                console.error("Not supported");
            }
        }
        mInteraction = null;
    }


    function draw() {
        mTabDrawingUtil.reset();

        let canvasWidth = mCanvas.attr("width");
        let canvasHeight = mCanvas.attr("height");
        let tabHeight = Math.round(canvasHeight * 0.8);
        let topPadding = canvasHeight - tabHeight - 1;

        let tabs = mDefaultTabs.concat(mDimensionTabs);
        let tabWidth = canvasWidth / tabs.length;

        tabs.forEach((tab, index) => {
            if (tab.id != mActiveTab) {
                mTabDrawingUtil.drawTab(
                    index * tabWidth,
                    topPadding,
                    tabWidth + 10,
                    tabHeight,
                    tab.title,
                    tab.id == mMousedOver,
                    mCodeUtil.getCode(tab.id, TAB_TARGET),
                    IdUtil.isType(tab.id, Data.Dimension) ? mCodeUtil.getCode(tab.id, CLOSE_TARGET) : null);
            }
        })
        mTabDrawingUtil.drawHorizontalLine(canvasHeight - 2, canvasWidth, 2);

        let tab = tabs.find(t => t.id == mActiveTab);
        let index = tabs.findIndex(t => t.id == mActiveTab);
        mTabDrawingUtil.drawTab(
            index * tabWidth,
            topPadding,
            tabWidth + 10,
            tabHeight,
            tab.title,
            true,
            mCodeUtil.getCode(tab.id, TAB_TARGET),
            IdUtil.isType(tab.id, Data.Dimension) ? mCodeUtil.getCode(tab.id, CLOSE_TARGET) : null);
    }

    function setActiveTab(tabId) {
        mActiveTab = tabId;
        draw();
    }

    function setTab(id, title) {
        let tab = mDimensionTabs.find(t => t.id == id);
        if (!tab) {
            tab = { id };
            mDimensionTabs.push(tab);
        }
        tab.title = title;
        draw();
    }

    function removeTab(id) {
        mDimensionTabs.splice(mDimensionTabs.find(t => t.id == id), 1);
        if (mActiveTab == id) { mSetTabCallback(Tab.LEGEND); }
        draw();
    }

    return {
        onModelUpdate,
        onResize,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        setActiveTab,
        setTab,
        removeTab,
        setSetTabCallback: (func) => mSetTabCallback = func,
    }
}
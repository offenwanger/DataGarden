function TabController() {
    let mCanvas = d3.select('#tabs-container').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInteractionCanvas = d3.select("#tabs-container").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    const TAB_TARGET = "tab";
    const CLOSE_TARGET = "close";

    const LEGEND_LABEL = "Dimensions";

    let mSetTabCallback = () => { };

    let mCodeUtil = new CodeUtil();

    let mInteraction = null;
    let mMousedOver = null;

    let mActiveTab = Tab.PARENT;
    let mTabs = [{
        title: "Overview",
        id: Tab.PARENT,
    }, {
        title: LEGEND_LABEL,
        id: Tab.LEGEND,
    }, {
        title: "Table",
        id: Tab.TABLE,
    }]

    let mTabDrawingUtil = new TabDrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d")
    );

    function onModelUpdate(model) {
        mTabs.forEach(tab => {
            if (IdUtil.isType(tab.id, Data.Dimension)) {
                let dimension = model.getDimension(tab.id);
                if (!dimension) {
                    resetDimensionTab();
                    mSetTabCallback(Tab.LEGEND);
                }
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

    function onPointerDown(screenCoords, systemState) {
        let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
        if (target) {
            mInteraction = target.id;
        }
    }

    function onPointerMove(screenCoords, systemState) {
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

    function onPointerUp(screenCoords, systemState) {
        let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
        if (target && target.id == mInteraction) {
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
        let tabWidth = canvasWidth / mTabs.length;

        mTabs.forEach((tab, index) => {
            if (tab.id != mActiveTab) {
                mTabDrawingUtil.drawTab(
                    index * tabWidth,
                    topPadding,
                    tabWidth + 10,
                    tabHeight,
                    tab.title,
                    tab.id == mMousedOver,
                    mCodeUtil.getCode(tab.id, TAB_TARGET));
            }
        })
        mTabDrawingUtil.drawHorizontalLine(canvasHeight - 2, canvasWidth, 2);

        let tab = mTabs.find(t => t.id == mActiveTab);
        let index = mTabs.findIndex(t => t.id == mActiveTab);
        if (tab) {
            mTabDrawingUtil.drawTab(
                index * tabWidth,
                topPadding,
                tabWidth + 10,
                tabHeight,
                tab.title,
                true,
                mCodeUtil.getCode(tab.id, TAB_TARGET));
        }
    }

    function setActiveTab(tabId) {
        mActiveTab = tabId;
        draw();
    }

    function setDimensionTab(id, title) {
        let dimenTab = mTabs.find(tab => IdUtil.isType(tab.id, Data.Dimension) || tab.id == Tab.LEGEND);
        dimenTab.id = id;
        dimenTab.title = title;
        draw();
    }

    function resetDimensionTab() {
        let dimenTab = mTabs.find(tab => IdUtil.isType(tab.id, Data.Dimension) || tab.id == Tab.LEGEND);
        dimenTab.id = Tab.LEGEND;
        dimenTab.title = LEGEND_LABEL;
        draw();
    }

    return {
        onModelUpdate,
        onResize,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        setActiveTab,
        setDimensionTab,
        resetDimensionTab,
        setSetTabCallback: (func) => mSetTabCallback = func,
    }
}
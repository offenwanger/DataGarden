
function DashboardController() {
    const TAB_HEIGHT = 60;

    let mCanvasController = new CanvasController();
    let mFdlViewController = new FdlViewController();
    let mTabController = new TabController();
    d3.select("#table-view-container").style("visibility", "hidden");

    let mMenuController = new MenuController();
    let mContextMenu = new ContextMenu(d3.select('#interface-svg'));
    let mTextInput = new TextInput();
    let mKeyBinding = new KeyBinding();

    let mModel = new DataModel();

    let mCanvasPercent = 0.5;
    let mWidth = 0;

    let mToolState = Buttons.SELECTION_BUTTON;
    let mFdlActive = true;

    let mAddDimentionCallback = () => { };
    let mNewStrokeCallback = () => { };
    let mParentUpdateCallback = () => { };
    let mMergeElementCallback = () => { };
    let mNewElementCallback = () => { };
    let mMoveElementCallback = () => { };
    let mMoveStrokeCallback = () => { };
    let mNewGroupCallback = () => { };
    let mDeleteCallback = () => { };
    let mNewDimentionCallback = () => { };
    let mMergeStrokesCallback = () => { };
    let mAutoMergeElements = () => { };
    let mCalculateSpineCallback = () => { };
    let mUndoCallback = () => { };
    let mRedoCallback = () => { };
    let mUpdateLevelNameCallback = () => { };
    let mUpdateDimentionNameCallback = () => { };

    function modelUpdate(model) {
        mModel = model;
        mCanvasController.onModelUpdate(model);
        mFdlViewController.onModelUpdate(model);
        mTabController.onModelUpdate(model);
    }

    function onResize(width, height) {
        mCanvasController.onResize(mCanvasPercent * width, height);
        mTabController.onResize((1 - mCanvasPercent) * width, TAB_HEIGHT);
        mFdlViewController.onResize((1 - mCanvasPercent) * width, height - TAB_HEIGHT);
        mMenuController.onResize(width, height);
        mWidth = width;
    }

    function onPointerDown(screenCoords) {
        mContextMenu.hideContextMenu();
        if (screenCoords.x < mWidth * mCanvasPercent) {
            mCanvasController.onPointerDown(screenCoords, mToolState);
        } else if (screenCoords.y < TAB_HEIGHT) {
            mTabController.onPointerDown(screenCoords, mToolState)
        } else if (mFdlActive) {
            mFdlViewController.onPointerDown(screenCoords, mToolState)
        } else {
            // The table is active and will handle it's own mouse events. I hope.
        }
    }

    function onPointerMove(screenCoords) {
        mCanvasController.onPointerMove(screenCoords, mToolState);
        mTabController.onPointerMove(screenCoords, mToolState);
        mFdlViewController.onPointerMove(screenCoords, mToolState);
    }

    function onPointerUp(screenCoords) {
        mCanvasController.onPointerUp(screenCoords, mToolState);
        mTabController.onPointerUp(screenCoords, mToolState);
        mFdlViewController.onPointerUp(screenCoords, mToolState);
    }

    function onDblClick(screenCoords) {

    }

    function onLongPress(screenCoords) {

    }

    function onKeyStateChange(keysDown) {
        let state = mKeyBinding.getState(keysDown);
        mMenuController.stateTransition(mToolState, state);
        mToolState = state;
    }

    function onEnter() {
        if (mTextInput.isShowing()) {
            mTextInput.returnText();
        }
    }

    function onDelete() {

    }

    mTextInput.setTextChangedCallback((itemId, text) => {
        if (IdUtil.isType(itemId, Data.Level)) {
            mUpdateLevelNameCallback(itemId, text);
        } else if (IdUtil.isType(itemId, Data.Dimention)) {
            mUpdateDimentionNameCallback(itemId, text);
        } else {
            console.error("Invalid id", itemId);
        }
    })

    mTabController.setSetTabCallback(tabId => {
        mTabController.setActiveTab(tabId);
        if (tabId == Tab.TABLE) {
            d3.select("#fdl-view-container").style("display", "none");
            d3.select("#table-view-container").style("display", "");
        } else {
            d3.select("#fdl-view-container").style("display", "");
            d3.select("#table-view-container").style("display", "none");
        }

        if (tabId == Tab.PARENT) {
            mFdlViewController.setMode(FdlMode.PARENT);
        } else if (tabId == Tab.LEGEND) {
            mFdlViewController.setMode(FdlMode.LEGEND);
        } else if (IdUtil.isType(tabId, Data.Dimention)) {
            mFdlViewController.setMode(FdlMode.DIMENTION, tabId);
        }
    })

    mCanvasController.setHighlightCallback((selection) => {
        mFdlViewController.highlight(selection);
    })

    mCanvasController.setSelectionCallback((selection) => {
        // selection could be strokes or elements
        // might select an entire element tree
        mVersionController.stack(selection);
    })

    function contextMenuCallback(screenCoords, selection) {
        if (!selection) { console.error("No selection provided!"); return; }
        if (Array.isArray(selection) && IdUtil.isType(selection[0], Data.Stroke)) {
            let buttons = [ContextButtons.MERGE_TO_ELEMENT, ContextButtons.AUTO_MERGE_ELEMENTS]
            mContextMenu.showContextMenu(screenCoords, buttons, (buttonId) => {
                if (buttonId == ContextButtons.MERGE_TO_ELEMENT) {
                    mMergeStrokesCallback(selection);
                } else if (buttonId == ContextButtons.AUTO_MERGE_ELEMENTS) {
                    mAutoMergeElements(selection);
                }
            });
        } else if (IdUtil.isType(selection, Data.Group)) {
            let group = mModel.getGroup(selection);
            if (!group) { console.error("Invalid selection", selection); return; }
            let buttons = []
            Object.values(ChannelType).forEach(channelType => {
                if (!group.mappings.find(m => m.channelType == channelType)) {
                    let button = Object.entries(ContextButtonToChannelType).find(e => e[1] == channelType)[0];
                    buttons.push(button);
                }
            });
            if (buttons.length > 0) {
                mContextMenu.showContextMenu(screenCoords, buttons, (buttonId) => {
                    mNewDimentionCallback(selection, ContextButtonToChannelType[buttonId]);
                    mContextMenu.hideContextMenu();
                });
            }
        } else if (IdUtil.isType(selection, Data.Element)) {
            let buttons = [ContextButtons.SPINE, ContextButtons.STYLE_STRIP, ContextButtons.STYLE_STROKES]
            mContextMenu.showContextMenu(screenCoords, buttons, (buttonId) => {
                if (buttonId == ContextButtons.SPINE) {
                    mCalculateSpineCallback(selection);
                } else if (buttonId == ContextButtons.STYLE_STRIP) {
                    console.error("Impliment me!")
                } else if (buttonId == ContextButtons.STYLE_STROKES) {
                    console.error("Impliment me!")
                }
            });
        }
    }
    mCanvasController.setContextMenuCallback(contextMenuCallback);
    mFdlViewController.setContextMenuCallback(contextMenuCallback);

    mFdlViewController.setHighlightCallback((selection) => {
        mCanvasController.highlight(selection);
    })

    mFdlViewController.setAddDimentionCallback(() => {
        let newDimention = mAddDimentionCallback();
        mTabController.setTab(newDimention.id, newDimention.name);
        mTabController.setActiveTab(newDimention.id);
        mFdlViewController.setMode(FdlMode.DIMENTION, newDimention.id);
    });

    mFdlViewController.setClickDimentionCallback((dimenId) => {
        let dimention = mModel.getDimention(dimenId);
        mTabController.setTab(dimenId, dimention.name);
        mTabController.setActiveTab(dimenId);
        mFdlViewController.setMode(FdlMode.DIMENTION, dimenId);
    });

    mFdlViewController.setEditNameCallback((itemId, x, y, width, height) => {
        let item;
        if (IdUtil.isType(itemId, Data.Level)) {
            item = mModel.getLevel(itemId);
        } else {
            item = mModel.getDimention(itemId);
        }
        mTextInput.show(itemId, item.name, x, y, width, height);
    });

    mMenuController.setColorChangeCallback((color) => {
        mCanvasController.setColor(color);
    });

    return {
        modelUpdate,
        onResize,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onDblClick,
        onLongPress,
        onKeyStateChange,
        onEnter,
        onDelete,
        setNewStrokeCallback: (func) => mCanvasController.setNewStrokeCallback(func),
        setParentUpdateCallback: (func) => mFdlViewController.setParentUpdateCallback(func),
        setMergeElementCallback: (func) => mMergeElementCallback = func,
        setNewElementCallback: (func) => mNewElementCallback = func,
        setMoveElementCallback: (func) => mMoveElementCallback = func,
        setMoveStrokeCallback: (func) => mMoveStrokeCallback = func,
        setNewGroupCallback: (func) => mNewGroupCallback = func,
        setDeleteCallback: (func) => mDeleteCallback = func,
        setNewDimentionCallback: (func) => mNewDimentionCallback = func,
        setMergeStrokesCallback: (func) => mMergeStrokesCallback = func,
        setAutoMergeElements: (func) => mAutoMergeElements = func,
        setCalculateSpineCallback: (func) => mCalculateSpineCallback = func,
        setUndoCallback: (func) => mUndoCallback = func,
        setRedoCallback: (func) => mRedoCallback = func,
        setAddDimentionCallback: (func) => mAddDimentionCallback = func,
        setAddLevelCallback: (func) => mFdlViewController.setAddLevelCallback(func),
        setUpdateLevelNameCallback: (func) => mUpdateLevelNameCallback = func,
        setUpdateDimentionNameCallback: (func) => mUpdateDimentionNameCallback = func,
    }
}
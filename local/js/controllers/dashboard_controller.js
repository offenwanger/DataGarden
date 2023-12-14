
function DashboardController() {
    const TAB_HEIGHT = 60;

    let mColorMap = d3.scaleOrdinal(d3.schemeCategory10);

    let mCanvasController = new CanvasController(mColorMap);
    let mFdlViewController = new FdlViewController(mColorMap);
    let mTableViewController = new TableViewController(mColorMap); mTableViewController.hide();
    let mTabController = new TabController();

    let mMenuController = new MenuController();
    let mContextMenu = new ContextMenu(d3.select('#interface-svg'));
    let mTextInput = new TextInput();
    let mDropdownInput = new DropdownInput();
    let mSystemState = new SystemState();

    let mModel = new DataModel();

    let mCanvasPercent = 0.5;
    let mWidth = 0;

    mMenuController.deactivateAll();
    mMenuController.activateButton(mSystemState.getToolState());

    let mFdlActive = true;

    let mAddDimensionCallback = () => { };
    let mNewStrokeCallback = () => { };
    let mParentUpdateCallback = () => { };
    let mMergeElementCallback = () => { };
    let mMoveElementCallback = () => { };
    let mDeleteCallback = () => { };
    let mNewDimensionCallback = () => { };
    let mMergeStrokesCallback = () => { };
    let mAutoMergeElements = () => { };
    let mCalculateSpineCallback = () => { };
    let mUndoCallback = () => { };
    let mRedoCallback = () => { };
    let mUpdateLevelNameCallback = () => { };
    let mUpdateDimensionNameCallback = () => { };
    let mUpdateDimensionDomainCallback = () => { };
    let mUpdateDimensionTypeCallback = () => { };
    let mUpdateDimensionChannelCallback = () => { };
    let mUpdateDimensionTierCallback = () => { };

    function modelUpdate(model) {
        mModel = model;
        // interface
        mTabController.onModelUpdate(model);
        // main controllers
        mCanvasController.onModelUpdate(model);
        mFdlViewController.onModelUpdate(model);
        mTableViewController.onModelUpdate(model);
        // minor controllers
        mDropdownInput.onModelUpdate(model);
    }

    function onResize(width, height) {
        mCanvasController.onResize(mCanvasPercent * width, height);
        mTabController.onResize((1 - mCanvasPercent) * width, TAB_HEIGHT);
        mFdlViewController.onResize((1 - mCanvasPercent) * width, height - TAB_HEIGHT);
        mMenuController.onResize(width, height);
        mTableViewController.onResize((1 - mCanvasPercent) * width, TAB_HEIGHT, height);
        mWidth = width;
    }

    function onPointerDown(screenCoords) {
        mContextMenu.hideContextMenu();
        if (screenCoords.x < mWidth * mCanvasPercent) {
            mCanvasController.onPointerDown(screenCoords, mSystemState);
        } else if (screenCoords.y < TAB_HEIGHT) {
            mTabController.onPointerDown(screenCoords, mSystemState)
        } else if (mFdlActive) {
            mFdlViewController.onPointerDown(screenCoords, mSystemState)
        } else {
            // The table is active and will handle it's own mouse events. I hope.
        }
    }

    function onPointerMove(screenCoords) {
        mCanvasController.onPointerMove(screenCoords, mSystemState);
        mTabController.onPointerMove(screenCoords, mSystemState);
        mFdlViewController.onPointerMove(screenCoords, mSystemState);
    }

    function onPointerUp(screenCoords) {
        mCanvasController.onPointerUp(screenCoords, mSystemState);
        mTabController.onPointerUp(screenCoords, mSystemState);
        mFdlViewController.onPointerUp(screenCoords, mSystemState);
    }

    function onDblClick(screenCoords) {

    }

    function onLongPress(screenCoords) {

    }

    function onKeyStateChange(keysDown) {
        mSystemState.setKeys(keysDown);
        mMenuController.deactivateAll();
        mMenuController.activateButton(mSystemState.getToolState());
    }

    function onUndo() {
        // if next undo is a selection, do that, otherwise pass it along
        // return the undo promise
        return mUndoCallback();
    }

    function onRedo() {
        // if next redo is a selection, do that, otherwise pass it along
        // return the redo promise
        return mRedoCallback();
    }


    function onEnter() {
        if (mTextInput.isShowing()) {
            mTextInput.returnText();
        }
    }

    function onDelete() {

    }

    mTextInput.setTextChangedCallback((itemId, text) => {
        if (itemId.dimention) {
            let dimension = mModel.getDimension(itemId.dimention);
            let domain = dimension.domain;
            if (itemId.id == DimensionValueId.V2) {
                domain[1] = text;
            } else if (itemId.id == DimensionValueId.V1) {
                domain[0] = text;
            } else { console.error("Invalid id", itemId); return; }
            mUpdateDimensionDomainCallback(itemId.dimention, domain);
        } else if (IdUtil.isType(itemId, Data.Level)) {
            mUpdateLevelNameCallback(itemId, text);
        } else if (IdUtil.isType(itemId, Data.Dimension)) {
            mUpdateDimensionNameCallback(itemId, text);
        } else {
            console.error("Invalid id", itemId);
        }
    })

    mDropdownInput.setSelectedCallback((dropdownType, dimensionId, value) => {
        if (dropdownType == DropDown.TYPE) {
            mUpdateDimensionTypeCallback(dimensionId, value);
        } else if (dropdownType == DropDown.CHANNEL) {
            mUpdateDimensionChannelCallback(dimensionId, value);
        } else if (dropdownType == DropDown.TIER) {
            mUpdateDimensionTierCallback(dimensionId, value);
        } else {
            console.error("Invalid type");
        }
    })

    mTabController.setSetTabCallback(tabId => {
        mTabController.setActiveTab(tabId);
        if (tabId == Tab.TABLE) {
            mFdlViewController.hide();
            mTableViewController.show();
        } else {
            mFdlViewController.show();
            mTableViewController.hide();
        }

        if (tabId == Tab.PARENT) {
            mFdlViewController.setMode(FdlMode.PARENT);
        } else if (tabId == Tab.LEGEND) {
            mFdlViewController.setMode(FdlMode.LEGEND);
        } else if (IdUtil.isType(tabId, Data.Dimension)) {
            mFdlViewController.setMode(FdlMode.DIMENSION, tabId);
        }
    })

    mCanvasController.setHighlightCallback(onHighlight)
    mFdlViewController.setHighlightCallback(onHighlight)
    mTableViewController.setHighlightCallback(onHighlight)
    function onHighlight(highlightedIds) {
        mCanvasController.onHighlight(highlightedIds);
        mFdlViewController.onHighlight(highlightedIds);
        mTableViewController.onHighlight(highlightedIds);
    }

    mCanvasController.setSelectionCallback(onSelection)
    mFdlViewController.setSelectionCallback(onSelection)
    mTableViewController.setSelectionCallback(onSelection)
    function onSelection(selectedIds) {
        mCanvasController.onSelection(selectedIds);
        mFdlViewController.onSelection(selectedIds);
        mTableViewController.onSelection(selectedIds);
    }

    mCanvasController.setContextMenuCallback(onContextMenu);
    mFdlViewController.setContextMenuCallback(onContextMenu);
    function onContextMenu(screenCoords, selection) {
        if (!selection) { console.error("No selection provided!"); return; }
        if (Array.isArray(selection) && IdUtil.isType(selection[0], Data.Stroke)) {
            let buttons = [ContextButtons.MERGE_TO_ELEMENT, ContextButtons.AUTO_MERGE_ELEMENTS]
            mContextMenu.showContextMenu(screenCoords, buttons, (buttonId) => {
                if (buttonId == ContextButtons.MERGE_TO_ELEMENT) {
                    mMergeStrokesCallback(selection);
                } else if (buttonId == ContextButtons.AUTO_MERGE_ELEMENTS) {
                    mAutoMergeElements(selection);
                }
                mContextMenu.hideContextMenu();
            });
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
                mContextMenu.hideContextMenu();
            });
        }
    }

    mFdlViewController.setAddDimensionCallback(() => {
        let newDimension = mAddDimensionCallback();
        mTabController.setTab(newDimension.id, newDimension.name);
        mTabController.setActiveTab(newDimension.id);
        mFdlViewController.setMode(FdlMode.DIMENSION, newDimension.id);
    });

    mFdlViewController.setClickDimensionCallback((dimenId) => {
        let dimension = mModel.getDimension(dimenId);
        mTabController.setTab(dimenId, dimension.name);
        mTabController.setActiveTab(dimenId);
        mFdlViewController.setMode(FdlMode.DIMENSION, dimenId);
    });

    mFdlViewController.setEditNameCallback((itemId, x, y, width, height) => {
        let item;
        if (IdUtil.isType(itemId, Data.Level)) {
            item = mModel.getLevel(itemId);
        } else {
            item = mModel.getDimension(itemId);
        }
        mTextInput.show(itemId, item.name, x, y, width, height);
    });

    mFdlViewController.setEditDomainCallback((dimentionId, minMax, x, y, width, height) => {
        let dimention = mModel.getDimension(dimentionId);
        mTextInput.show({ dimention: dimentionId, id: minMax },
            minMax == DimensionValueId.V1 ? dimention.domain[0] : dimention.domain[1],
            x, y, width, height);
    });

    mFdlViewController.setEditTypeCallback((dimensionId, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mDropdownInput.show(DropDown.TYPE, dimensionId, dimension.type, x, y, width, height);
    });

    mFdlViewController.setEditChannelCallback((dimensionId, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mDropdownInput.show(DropDown.CHANNEL, dimensionId, dimension.channel, x, y, width, height);
    });

    mFdlViewController.setEditTierCallback((dimensionId, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mDropdownInput.show(DropDown.TIER, dimensionId, dimension.tier, x, y, width, height);
    });

    mMenuController.setColorChangeCallback((color) => {
        mCanvasController.setColor(color);
    });

    mMenuController.setOnClickCallback((button) => {
        if (button == Buttons.BRUSH_BUTTON ||
            button == Buttons.SELECTION_BUTTON ||
            button == Buttons.PANNING_BUTTON ||
            button == Buttons.ZOOM_BUTTON) {
            if (mSystemState.isDefaultToolState()) {
                mMenuController.deactivateButton(mSystemState.getToolState());
                mMenuController.activateButton(button);
            }
            mSystemState.setDefaultToolState(button)
        } else if (button == Buttons.VIEW_BUTTON) {
            mSystemState.toggleStructureViewActive();
            if (mSystemState.isStructureViewActive()) {
                mMenuController.deactivateButton(button);
            } else {
                mMenuController.activateButton(button);
            }
            mCanvasController.setStructureMode(mSystemState.isStructureViewActive());
        }
    })

    return {
        modelUpdate,
        onResize,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onDblClick,
        onLongPress,
        onKeyStateChange,
        onUndo,
        onRedo,
        onEnter,
        onDelete,
        setNewStrokeCallback: (func) => mCanvasController.setNewStrokeCallback(func),
        setStructureMode: (to) => mCanvasController.setStructureMode(to),
        setParentUpdateCallback: (func) => mFdlViewController.setParentUpdateCallback(func),
        setMergeElementCallback: (func) => mMergeElementCallback = func,
        setMoveElementCallback: (func) => mMoveElementCallback = func,
        setDeleteCallback: (func) => mDeleteCallback = func,
        setNewDimensionCallback: (func) => mNewDimensionCallback = func,
        setMergeStrokesCallback: (func) => mMergeStrokesCallback = func,
        setAutoMergeElements: (func) => mAutoMergeElements = func,
        setCalculateSpineCallback: (func) => mCalculateSpineCallback = func,
        setUndoCallback: (func) => mUndoCallback = func,
        setRedoCallback: (func) => mRedoCallback = func,
        setAddDimensionCallback: (func) => mAddDimensionCallback = func,
        setAddLevelCallback: (func) => mFdlViewController.setAddLevelCallback(func),
        setUpdateLevelCallback: (func) => mFdlViewController.setUpdateLevelCallback(func),
        setUpdateLevelNameCallback: (func) => mUpdateLevelNameCallback = func,
        setUpdateDimensionNameCallback: (func) => mUpdateDimensionNameCallback = func,
        setUpdateDimensionDomainCallback: (func) => mUpdateDimensionDomainCallback = func,
        setUpdateDimensionTypeCallback: (func) => mUpdateDimensionTypeCallback = func,
        setUpdateDimensionChannelCallback: (func) => mUpdateDimensionChannelCallback = func,
        setUpdateDimensionTierCallback: (func) => mUpdateDimensionTierCallback = func,
    }
}
import { Buttons, ContextButtons, DimensionValueId, DropDown, FdlMode, Tab } from "../constants.js";
import { DataModel } from "../data_model.js";
import { Data } from "../data_structs.js";
import { FileHandler } from "../file_handler.js";
import { ContextMenu } from "../menu/context_menu.js";
import { CursorTag } from "../menu/cursor_tag.js";
import { DropdownInput } from "../menu/dropdown_input.js";
import { FloatingButton } from "../menu/floating_button.js";
import { TextInput } from "../menu/text_input.js";
import { ClassifierUtil } from "../utils/classifier_util.js";
import { DataUtil } from "../utils/data_util.js";
import { IdUtil } from "../utils/id_util.js";
import { CanvasController } from "./canvas_controller.js";
import { FdlViewController } from "./fdl/fdl_view_controller.js";
import { MenuController } from "./menu_controller.js";
import { SystemState } from "./system_state_controller.js";
import { TabController } from "./tab_controller.js";
import { TableViewController } from "./table_view_controller.js";

export function DashboardController() {
    const TAB_HEIGHT = 60;

    let mColorMap = d3.scaleOrdinal(d3.schemeCategory10);

    let mCanvasController = new CanvasController(mColorMap);
    let mFdlViewController = new FdlViewController(mColorMap);
    let mTableViewController = new TableViewController(mColorMap); mTableViewController.hide();
    let mTabController = new TabController();

    let mMenuController = new MenuController();
    let mContextMenu = new ContextMenu(d3.select('#interface-svg'));
    let mCursorTag = new CursorTag(d3.select('#interface-svg'));
    let mTextInput = new TextInput();
    let mDropdownInput = new DropdownInput();
    let mDimentionViewBackButton = new FloatingButton(d3.select('#interface-svg'));

    let mSystemState = new SystemState();
    let mSelection = [];

    let mModel = new DataModel();

    let mCanvasPercent = 0.5;
    let mWidth = 0;

    mMenuController.deactivateAll();
    mMenuController.activateButton(mSystemState.getToolState());

    let mFdlActive = true;

    let mAddDimensionCallback = () => { };
    let mDeleteCallback = () => { };
    let mMergeStrokesCallback = () => { };
    let mCalculateSpineCallback = () => { };
    let mUndoCallback = () => { };
    let mRedoCallback = () => { };
    let mUpdateLevelNameCallback = () => { };
    let mUpdateDimensionNameCallback = () => { };
    let mUpdateDimensionDomainCallback = () => { };
    let mUpdateDimensionTypeCallback = () => { };
    let mUpdateDimensionChannelCallback = () => { };
    let mUpdateDimensionTierCallback = () => { };
    let mUpdateColorCallback = () => { };
    let mLoadModelCallback = () => { };

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
        mSelection = mSelection.filter(id => {
            // if it's not an id for a data item, then it won't have been deleted. 
            if (!DataUtil.isDataId(id)) return true;
            if (DataUtil.itemExists(id, model)) return true;
            return false;
        });
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
        if (mSystemState.getToolState() == ContextButtons.PARENT) {
            mSystemState.clearOverrideToolState();
            mCursorTag.hide()
        }
    }

    function onPointerMove(screenCoords) {
        mCanvasController.onPointerMove(screenCoords, mSystemState);
        mTabController.onPointerMove(screenCoords, mSystemState);
        mFdlViewController.onPointerMove(screenCoords, mSystemState);
        mCursorTag.onPointerMove(screenCoords, mSystemState);
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
        mDeleteCallback(mSelection)
    }

    async function onExportElementsSet() {
        try {
            let workspace = await FileHandler.getWorkspace()
            mModel.getElements().forEach((element, index) => {
                workspace.writePNG(ClassifierUtil.elementToImg(element, 16), 'trainingData', "16p" + Date.now() + "e" + index);
                workspace.writePNG(ClassifierUtil.elementToImg(element, 32), 'trainingData', "32p" + Date.now() + "e" + index);
            });
        } catch (e) {
            console.error(e);
        }
    }

    mTextInput.setTextChangedCallback((itemId, text) => {
        if (itemId.dimension) {
            let dimension = mModel.getDimension(itemId.dimension);
            let domain = dimension.domain;
            if (itemId.id == DimensionValueId.V2) {
                domain[1] = text;
            } else if (itemId.id == DimensionValueId.V1) {
                domain[0] = text;
            } else { console.error("Invalid id", itemId); return; }
            mUpdateDimensionDomainCallback(itemId.dimension, domain);
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
        mDimentionViewBackButton.hide();

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
            setDimensionTab(tabId);
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
        mSelection = selectedIds;
        mCanvasController.onSelection(selectedIds);
        mFdlViewController.onSelection(selectedIds);
        mTableViewController.onSelection(selectedIds);
    }

    mCanvasController.setContextMenuCallback(onContextMenu);
    mFdlViewController.setContextMenuCallback(onContextMenu);
    function onContextMenu(screenCoords, selection, target) {
        if (!selection || !Array.isArray(selection)) { console.error("Invalid selection!", selection); return; }
        if (!selection.some(id =>
            IdUtil.isType(id, Data.Stroke)
            || IdUtil.isType(id, Data.Element)
            || IdUtil.isType(id, Data.Level)
            || IdUtil.isType(id, Data.Dimension))) {
            // if it's not one of the above, there's no context menu.  
            return;
        }
        let buttons = [ContextButtons.DELETE];
        if (selection.some(id => IdUtil.isType(id, Data.Stroke) || IdUtil.isType(id, Data.Element))) {
            buttons.push(ContextButtons.MERGE_TO_ELEMENT);
            buttons.push(ContextButtons.PARENT);
            buttons.push(ContextButtons.SPINE);
            buttons.push(ContextButtons.COLOR)
        }

        mContextMenu.showContextMenu(screenCoords, buttons, (buttonId) => {
            if (buttonId == ContextButtons.MERGE_TO_ELEMENT) {
                let strokes = [];
                selection.forEach(id => {
                    if (IdUtil.isType(id, Data.Stroke)) {
                        strokes.push(id);
                    } else if (IdUtil.isType(id, Data.Element)) {
                        let element = mModel.getElement(id);
                        if (!element) console.error("Invalid element id", id);
                        strokes.push(...element.strokes.map(s => s.id));
                    }
                })
                mMergeStrokesCallback(strokes);
            } else if (buttonId == ContextButtons.SPINE) {
                let element;
                if (IdUtil.isType(target, Data.Stroke)) {
                    element = mModel.getElementForStroke(target);
                } else if (IdUtil.isType(target, Data.Element)) {
                    element = mModel.getElement(target);
                }
                if (!element) console.error("Cannot find element for id", id);
                mCalculateSpineCallback(element.id);
            } else if (buttonId == ContextButtons.PARENT) {
                mSystemState.setOverrideToolState(ContextButtons.PARENT);
                mCursorTag.show(ContextButtons.PARENT)
            } else if (buttonId == ContextButtons.DELETE) {
                mDeleteCallback(selection);
            } else if (buttonId == ContextButtons.COLOR) {
                mMenuController.showColorPicker(screenCoords);
            }
            mContextMenu.hideContextMenu();
        });

    }

    mFdlViewController.setAddDimensionCallback(() => {
        let newDimension = mAddDimensionCallback();
        setDimensionTab(newDimension.id);
    });

    mFdlViewController.setClickDimensionCallback((dimenId) => {
        setDimensionTab(dimenId)
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

    mFdlViewController.setEditDomainCallback((dimensionId, minMax, x, y, width, height) => {
        let dimension = mModel.getDimension(dimensionId);
        mTextInput.show({ dimension: dimensionId, id: minMax },
            minMax == DimensionValueId.V1 ? dimension.domain[0] : dimension.domain[1],
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

    mMenuController.setColorChangeCallback((color, interfaceOnly) => {
        if (!interfaceOnly) {
            let strokes = mSelection.filter(id => IdUtil.isType(id, Data.Stroke) || IdUtil.isType(id, Data.Element)).map(id =>
                IdUtil.isType(id, Data.Stroke) ? mModel.getStroke(id) : mModel.getElement(id).strokes).flat();
            strokes.forEach(stroke => {
                stroke.color = color;
            });
            modelUpdate(mModel);
        } else {
            mCanvasController.setColor(color);
        }
    });

    mMenuController.setColorPickedCallback((color, interfaceOnly) => {
        if (!interfaceOnly) {
            mUpdateColorCallback(mSelection.filter(id => IdUtil.isType(id, Data.Stroke) || IdUtil.isType(id, Data.Element)), color);
        } else {
            mCanvasController.setColor(color);
        }
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
                mMenuController.activateButton(button);
            } else {
                mMenuController.deactivateButton(button);
            }
            mCanvasController.setStructureMode(mSystemState.isStructureViewActive());
        } else if (button == Buttons.DOWNLOAD) {
            FileHandler.downloadJSON(mModel.toObject());
        } else if (button == Buttons.UPLOAD) {
            mLoadModelCallback();
        }
    })

    mDimentionViewBackButton.setOnClickCallback(() => {
        mDimentionViewBackButton.hide();
        mTabController.resetDimensionTab();
        mTabController.setActiveTab(Tab.LEGEND);
        mFdlViewController.setMode(FdlMode.LEGEND);
    })

    function setDimensionTab(dimenId) {
        let dimension = mModel.getDimension(dimenId);
        mTabController.setDimensionTab(dimenId, dimension.name);
        mTabController.setActiveTab(dimenId);
        mFdlViewController.setMode(FdlMode.DIMENSION, dimenId);
        let tabBB = mTabController.getTabBB(dimenId);
        mDimentionViewBackButton.show(tabBB.x + 1, tabBB.y + 3 + tabBB.height, "<- Back to All Dimentions");
    }

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
        onExportElementsSet,
        setNewStrokeCallback: (func) => mCanvasController.setNewStrokeCallback(func),
        setStructureMode: (to) => mCanvasController.setStructureMode(to),
        setParentUpdateCallback: (func) => { mFdlViewController.setParentUpdateCallback(func); mCanvasController.setParentUpdateCallback(func); },
        setTranslateStrokesCallback: (func) => mCanvasController.setTranslateStrokesCallback(func),
        setUpdateAngleCallback: (func) => mCanvasController.setUpdateAngleCallback(func),
        setDeleteCallback: (func) => mDeleteCallback = func,
        setMergeStrokesCallback: (func) => mMergeStrokesCallback = func,
        setCalculateSpineCallback: (func) => mCalculateSpineCallback = func,
        setUndoCallback: (func) => mUndoCallback = func,
        setRedoCallback: (func) => mRedoCallback = func,
        setAddDimensionCallback: (func) => mAddDimensionCallback = func,
        setAddLevelCallback: (func) => mFdlViewController.setAddLevelCallback(func),
        setUpdateLevelCallback: (func) => mFdlViewController.setUpdateLevelCallback(func),
        setLevelOrderUpdateCallback: (func) => mFdlViewController.setLevelOrderUpdateCallback(func),
        setUpdateRangeControlCallback: (func) => mFdlViewController.setUpdateRangeControlCallback(func),
        setUpdateLevelNameCallback: (func) => mUpdateLevelNameCallback = func,
        setUpdateDimensionNameCallback: (func) => mUpdateDimensionNameCallback = func,
        setUpdateDimensionDomainCallback: (func) => mUpdateDimensionDomainCallback = func,
        setUpdateDimensionTypeCallback: (func) => mUpdateDimensionTypeCallback = func,
        setUpdateDimensionChannelCallback: (func) => mUpdateDimensionChannelCallback = func,
        setUpdateDimensionTierCallback: (func) => mUpdateDimensionTierCallback = func,
        setUpdateColorCallback: (func) => mUpdateColorCallback = func,
        setLoadModelCallback: (func) => mLoadModelCallback = func,
    }
}
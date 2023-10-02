function MenuController(svg) {
    const BUTTON_SIZE = 40;

    let mBrushButton;
    let mSelectionButton;
    let mPanButton;
    let mZoomButton;
    let mViewButton;

    let mColorSelectorButton;
    let mColorPicker;
    let mColorPickerContainer;

    let mPlayButton;
    let mPauseButton;

    let mGroupContextMenu;

    let mColorChangeCallback = () => { };
    let mPauseCallback = () => { };

    function createInterface(svg) {
        FiltersUtil.addOutlineFilter(svg);
        FiltersUtil.addShadowFilter(svg);

        mPanButton = new MenuButton("pan-button", svg, "img/panning_button.svg", BUTTON_SIZE);
        mZoomButton = new MenuButton("zoom-button", svg, "img/zoom_button.svg", BUTTON_SIZE);
        mZoomButton.isSubButton(20, 10);
        mBrushButton = new MenuButton("brush-button", svg, "img/color_brush_button.svg", BUTTON_SIZE);
        mSelectionButton = new MenuButton("selection-button", svg, "img/selection_button.svg", BUTTON_SIZE);
        mViewButton = new MenuButton("view-button", svg, "img/eyecon_button.svg", BUTTON_SIZE);

        mPlayButton = new MenuButton("play-button", svg, "img/play_button.svg", BUTTON_SIZE);
        mPlayButton.hide();
        mPlayButton.setOnClickCallback(() => {
            mPlayButton.hide();
            mPauseButton.show();
            mPauseCallback(false);
        })
        mPauseButton = new MenuButton("pause-button", svg, "img/pause_button.svg", BUTTON_SIZE);
        mPauseButton.setOnClickCallback(() => {
            mPlayButton.show();
            mPauseButton.hide();
            mPauseCallback(true);
        })

        mColorSelectorButton = new MenuButton("color-button", svg, "img/color_selector.svg", BUTTON_SIZE, () => {
            // this triggers on change
            mColorPicker.setColor("#333333", false)
        })
        mColorSelectorButton.setOnClickCallback(function () {
            mColorPicker.openHandler();
        })

        mColorPickerContainer = d3.select("#color-container");
        mColorPicker = new Picker({ parent: mColorPickerContainer.node(), popup: "top" });
        mColorPicker.onChange = function (color) {
            mColorChangeCallback(color.hex);
            d3.select("#color-selector-color").style("fill", color.hex)
        };

        mGroupContextMenu = new RadialContextMenu(svg, [{
            id: ContextButtons.ADD_DIMENTION,
            img: "img/add_dimention.svg",
            tooltip: "Add a new dimention"
        }], 40);
        mGroupContextMenu.onClick((id) => {
            if (id == ContextButtons.ADD_DIMENTION) {
                mNewDimentionCallback();
            }
        })
        mGroupContextMenu.hide();

        layout(svg.attr('width'), svg.attr('height'));
    }

    function stateTransition(oldState, newState) {
        if (isChildButton(newState, oldState) || isChildButton(oldState, newState)) {
            deactivateButton(oldState)
            activateButton(newState);
        } else {
            deactivateButton(oldState)
            oldState = getParentButton(oldState) ? getParentButton(oldState) : oldState;
            getChildButtons(oldState).forEach(b => hideButton(b));

            activateButton(newState)
            getChildButtons(newState).forEach(b => showButton(b));
        }
    }

    function isChildButton(child, parent) {
        if (parent == Buttons.PANNING_BUTTON && child == Buttons.ZOOM_BUTTON) {
            return true;
        } else {
            return false;
        }
    }

    function getChildButtons(parent) {
        if (parent == Buttons.PANNING_BUTTON) {
            return [Buttons.ZOOM_BUTTON];
        } else return [];
    }

    function getParentButton(child) {
        if (child == Buttons.ZOOM_BUTTON) {
            return Buttons.PANNING_BUTTON;
        } else return null;
    }

    function activateButton(buttonId) {
        if (buttonId == Buttons.BRUSH_BUTTON) {
            mBrushButton.setActive(true)
        } else if (buttonId == Buttons.SELECTION_BUTTON) {
            mSelectionButton.setActive(true)
        } else if (buttonId == Buttons.PANNING_BUTTON) {
            mPanButton.setActive(true)
        } else if (buttonId == Buttons.ZOOM_BUTTON) {
            mZoomButton.setActive(true)
        } else if (buttonId == Buttons.VIEW_BUTTON) {
            mViewButton.setActive(true)
        } else {
            console.error("Invalid activate button id: " + buttonId)
        }
    }

    function deactivateButton(buttonId) {
        if (buttonId == Buttons.BRUSH_BUTTON) {
            mBrushButton.setActive(false)
        } else if (buttonId == Buttons.SELECTION_BUTTON) {
            mSelectionButton.setActive(false)
        } else if (buttonId == Buttons.PANNING_BUTTON) {
            mPanButton.setActive(false)
        } else if (buttonId == Buttons.ZOOM_BUTTON) {
            mZoomButton.setActive(false)
        } else if (buttonId == Buttons.VIEW_BUTTON) {
            mViewButton.setActive(false)
        } else {
            console.error("Invalid deactivate button id: " + buttonId)
        }
    }

    function showButton(buttonId) {
        if (buttonId == Buttons.ZOOM_BUTTON) {
            mZoomButton.show()
        } else {
            console.error("Invalid show button id: " + buttonId)
        }
    }

    function hideButton(buttonId) {
        if (buttonId == Buttons.ZOOM_BUTTON) {
            mZoomButton.hide()
        } else {
            console.error("Invalid hide button id: " + buttonId)
        }
    }

    function layout(width, height) {
        let buttonSpacing = BUTTON_SIZE * 1.5;

        mBrushButton.setPosition(buttonSpacing * 2.5, height - BUTTON_SIZE);
        mSelectionButton.setPosition(buttonSpacing * 1.5, height - BUTTON_SIZE);
        mPanButton.setPosition(buttonSpacing * 0.5, height - BUTTON_SIZE);
        mZoomButton.setPosition(buttonSpacing * 0.5, height - BUTTON_SIZE);
        mViewButton.setPosition(buttonSpacing * 3.5, height - BUTTON_SIZE);
        mColorSelectorButton.setPosition(buttonSpacing * 4.5, height - BUTTON_SIZE);
        mColorPickerContainer.style("left", (buttonSpacing * 4.5 - BUTTON_SIZE / 2) + "px").style("top", (height - BUTTON_SIZE * 1.5) + "px");
        mPlayButton.setPosition(buttonSpacing * 0.5 + width / 2, buttonSpacing * 0.5);
        mPauseButton.setPosition(buttonSpacing * 0.5 + width / 2, buttonSpacing * 0.5);
    }

    function showGroupContextMenu(pos) {
        mGroupContextMenu.setPosition(pos.x, pos.y);
        mGroupContextMenu.show();
    }

    function hideContextMenus() {
        mGroupContextMenu.hide();
    }

    createInterface(svg);

    return {
        onResize: layout,
        stateTransition,
        showGroupContextMenu,
        hideContextMenus,
        setColorChangeCallback: (func) => mColorChangeCallback = func,
        setPauseCallback: (func) => mPauseCallback = func,
        setNewDimentionCallback: (func) => mNewDimentionCallback = func,
    }
}
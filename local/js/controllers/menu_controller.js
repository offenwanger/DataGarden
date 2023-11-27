function MenuController() {
    const BUTTON_SIZE = 40;

    let mBrushButton;
    let mSelectionButton;
    let mPanButton;
    let mZoomButton;
    let mViewButton;

    let mColorSelectorButton;
    let mColorPicker;
    let mColorPickerContainer;

    let mColorChangeCallback = () => { };
    let mPauseCallback = () => { };

    let mSvg = d3.select('#interface-svg');

    FiltersUtil.addOutlineFilter(mSvg);
    FiltersUtil.addShadowFilter(mSvg);

    mPanButton = new MenuButton("pan-button", mSvg, "img/panning_button.svg", BUTTON_SIZE);
    mZoomButton = new MenuButton("zoom-button", mSvg, "img/zoom_button.svg", BUTTON_SIZE);
    mZoomButton.isSubButton(20, 10);
    mBrushButton = new MenuButton("brush-button", mSvg, "img/color_brush_button.svg", BUTTON_SIZE);
    mSelectionButton = new MenuButton("selection-button", mSvg, "img/selection_button.svg", BUTTON_SIZE);
    mViewButton = new MenuButton("view-button", mSvg, "img/eyecon_button.svg", BUTTON_SIZE);

    mColorSelectorButton = new MenuButton("color-button", mSvg, "img/color_selector.svg", BUTTON_SIZE, () => {
        // this triggers on change
        mColorPicker.setColor("#333333", false)
    })
    mColorSelectorButton.setOnClickCallback(function () {
        mColorPicker.openHandler();
    })

    mColorPickerContainer = d3.select("#color-container");
    mColorPicker = new Picker({ parent: mColorPickerContainer.node(), popup: "right" });
    mColorPicker.onChange = function (color) {
        mColorChangeCallback(color.hex);
        d3.select("#color-selector-color").style("fill", color.hex)
    };

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

    function onResize(width, height) {
        let buttonSpacing = BUTTON_SIZE * 1.5;

        mSvg.attr('width', width)
        mSvg.attr('height', height)

        mBrushButton.setPosition(BUTTON_SIZE, buttonSpacing * 2.5);
        mSelectionButton.setPosition(BUTTON_SIZE, buttonSpacing * 1.5);
        mPanButton.setPosition(BUTTON_SIZE, buttonSpacing * 0.5);
        mZoomButton.setPosition(BUTTON_SIZE, buttonSpacing * 0.5);
        mViewButton.setPosition(BUTTON_SIZE, buttonSpacing * 3.5);
        mColorSelectorButton.setPosition(BUTTON_SIZE, buttonSpacing * 4.5);
        mColorPickerContainer.style("left", (BUTTON_SIZE * 1.5) + "px").style("top", (buttonSpacing * 4.5 - BUTTON_SIZE / 2) + "px");

    }

    return {
        onResize,
        stateTransition,
        setColorChangeCallback: (func) => mColorChangeCallback = func,
        setPauseCallback: (func) => mPauseCallback = func,
    }
}
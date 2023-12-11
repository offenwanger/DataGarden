function MenuController() {
    const BUTTON_SIZE = 40;
    let mColorPicker;
    let mColorPickerContainer;

    let mColorChangeCallback = () => { };
    let mOnClickCallack = () => { };

    let mSvg = d3.select('#interface-svg');

    FiltersUtil.addOutlineFilter(mSvg);
    FiltersUtil.addShadowFilter(mSvg);

    let mButtons = {}
    mButtons[Buttons.PANNING_BUTTON] = new MenuButton("pan-button", mSvg, "img/panning_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.PANNING_BUTTON));
    mButtons[Buttons.BRUSH_BUTTON] = new MenuButton("brush-button", mSvg, "img/color_brush_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.BRUSH_BUTTON));
    mButtons[Buttons.SELECTION_BUTTON] = new MenuButton("selection-button", mSvg, "img/selection_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.SELECTION_BUTTON));
    mButtons[Buttons.ZOOM_BUTTON] = new MenuButton("zoom-button", mSvg, "img/zoom_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.ZOOM_BUTTON));
    mButtons[Buttons.VIEW_BUTTON] = new MenuButton("view-button", mSvg, "img/eyecon_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.VIEW_BUTTON));
    mButtons[Buttons.COLOR_BUTTON] = new MenuButton("color-button", mSvg, "img/color_selector.svg", BUTTON_SIZE, () => mColorPicker.openHandler(), () => {
        // When loaded, set the color, this triggers on change
        mColorPicker.setColor("#333333", false)
    });

    let mParents = [
        [Buttons.PANNING_BUTTON, Buttons.ZOOM_BUTTON]
    ]

    mColorPickerContainer = d3.select("#color-container");
    mColorPicker = new Picker({ parent: mColorPickerContainer.node(), popup: "right" });
    mColorPicker.onChange = function (color) {
        mColorChangeCallback(color.hex);
        d3.select("#color-selector-color").style("fill", color.hex)
    };

    function activateButton(buttonId) {
        if (!buttonId in mButtons) { console.error("Invalid button id: " + buttonId); return; }
        let button = mButtons[buttonId];
        button.setActive(true);
        button.show();
        mParents.filter(([parentId, childId]) => parentId == buttonId)
            .map(([parentId, childId]) => childId)
            .forEach(buttonId => mButtons[buttonId].show());
    }

    function deactivateButton(buttonId) {
        if (!buttonId in mButtons) { console.error("Invalid button id: " + buttonId); return; }
        mButtons[buttonId].setActive(false);
        if (mParents.find(([parentId, childId]) => childId == buttonId)) {
            mButtons[buttonId].hide();
        }
        mParents.filter(([parentId, childId]) => parentId == buttonId)
            .map(([parentId, childId]) => childId)
            .forEach(buttonId => mButtons[buttonId].hide());
    }

    function deactivateAll() {
        Object.values(mButtons).forEach(button => button.setActive(false));
        mParents.forEach(([parentId, childId]) => mButtons[childId].hide());
    }

    function onResize(width, height) {
        let buttonSpacing = BUTTON_SIZE * 1.5;

        mSvg.attr('width', width)
        mSvg.attr('height', height)

        mButtons[Buttons.PANNING_BUTTON].setPosition(BUTTON_SIZE, buttonSpacing * 0.5);
        mButtons[Buttons.ZOOM_BUTTON].setPosition(BUTTON_SIZE + buttonSpacing * 0.25, buttonSpacing * 0.75);
        mButtons[Buttons.SELECTION_BUTTON].setPosition(BUTTON_SIZE, buttonSpacing * 1.5);
        mButtons[Buttons.BRUSH_BUTTON].setPosition(BUTTON_SIZE, buttonSpacing * 2.5);
        mButtons[Buttons.VIEW_BUTTON].setPosition(BUTTON_SIZE, buttonSpacing * 3.5);
        mButtons[Buttons.COLOR_BUTTON].setPosition(BUTTON_SIZE, buttonSpacing * 4.5);
        mColorPickerContainer.style("left", (BUTTON_SIZE * 1.5) + "px").style("top", (buttonSpacing * 4.5 - BUTTON_SIZE / 2) + "px");

    }

    return {
        onResize,
        activateButton,
        deactivateButton,
        deactivateAll,
        setColorChangeCallback: (func) => mColorChangeCallback = func,
        setOnClickCallback: (func) => mOnClickCallack = func,
    }
}
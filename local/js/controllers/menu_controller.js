import { Buttons } from "../constants.js";
import { MenuButton } from "../menu/menu_button.js";
import { FiltersUtil } from "../utils/filters_util.js";

export function MenuController() {
    const BUTTON_SIZE = 40;
    let mColorPicker;
    let mColorPickerContainer;

    let mColorPickerInternalOpen = true;

    let mColorChangeCallback = () => { };
    let mColorPickedCallback = () => { };
    let mOnClickCallack = () => { };

    let mSvg = d3.select('#interface-svg');

    FiltersUtil.addOutlineFilter(mSvg);
    FiltersUtil.addShadowFilter(mSvg);

    let mButtons = {}
    mButtons[Buttons.COLOR_BUTTON] = new MenuButton("color-button", mSvg, "img/color_selector.svg", BUTTON_SIZE, () => openBrushColorPicker(), () => {
        // When loaded, set the color, this triggers on change
        mColorPicker.setColor("#33333300", false)
    });
    mButtons[Buttons.ZOOM_BUTTON] = new MenuButton("zoom-button", mSvg, "img/zoom_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.ZOOM_BUTTON));


    mButtons[Buttons.PANNING_BUTTON] = new MenuButton("pan-button", mSvg, "img/panning_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.PANNING_BUTTON));
    mButtons[Buttons.BRUSH_BUTTON] = new MenuButton("brush-button", mSvg, "img/color_brush_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.BRUSH_BUTTON));
    mButtons[Buttons.SELECTION_BUTTON] = new MenuButton("selection-button", mSvg, "img/selection_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.SELECTION_BUTTON));
    mButtons[Buttons.CURSOR_BUTTON] = new MenuButton("cursor-button", mSvg, "img/cursor_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.CURSOR_BUTTON));
    mButtons[Buttons.VIEW_BUTTON] = new MenuButton("view-button", mSvg, "img/eyecon_button.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.VIEW_BUTTON));
    mButtons[Buttons.DOWNLOAD] = new MenuButton("download-button", mSvg, "img/download.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.DOWNLOAD));
    mButtons[Buttons.UPLOAD] = new MenuButton("upload-button", mSvg, "img/upload.svg", BUTTON_SIZE, () => mOnClickCallack(Buttons.UPLOAD));

    let mParents = [
        [Buttons.PANNING_BUTTON, Buttons.ZOOM_BUTTON],
        [Buttons.BRUSH_BUTTON, Buttons.COLOR_BUTTON],
    ]

    let buttonSpacing = BUTTON_SIZE * 1.5;
    [
        Buttons.CURSOR_BUTTON,
        Buttons.SELECTION_BUTTON,
        Buttons.BRUSH_BUTTON,
        Buttons.VIEW_BUTTON,
        Buttons.PANNING_BUTTON,
        Buttons.DOWNLOAD,
        Buttons.UPLOAD,
    ].forEach((id, index) => {
        mButtons[id].setPosition(BUTTON_SIZE, buttonSpacing * (0.5 + index));
        mParents.filter(row => row[0] == id).forEach(([parentId, childId], subIndex) => {
            mButtons[childId].setPosition(BUTTON_SIZE + buttonSpacing * (0.5 + subIndex), buttonSpacing * (0.25 + index) + buttonSpacing * 0.5)
        });
    });

    mColorPickerContainer = d3.select("#color-container");
    mColorPicker = new Picker({ parent: mColorPickerContainer.node(), popup: "right" });
    mColorPicker.onChange = function (color) {
        mColorChangeCallback(color.hex, mColorPickerInternalOpen);
        if (mColorPickerInternalOpen) {
            d3.select("#color-selector-color").style("fill", color.hex)
        }
    };
    mColorPicker.onClose = function (color) {
        mColorPickedCallback(color.hex, mColorPickerInternalOpen);
    }

    function activateButton(buttonId) {
        // if the active button is not a menu button do nothing.
        if (!buttonId in mButtons) { return; }
        let button = mButtons[buttonId];
        button.setActive(true);
        button.show();
        mParents.filter(([parentId, childId]) => parentId == buttonId)
            .map(([parentId, childId]) => childId)
            .forEach(buttonId => mButtons[buttonId].show());
    }

    function deactivateButton(buttonId) {
        // if the active button is not a menu button do nothing.
        if (!buttonId in mButtons) { return; }
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
        mSvg.attr('width', width)
        mSvg.attr('height', height)
    }

    function openBrushColorPicker() {
        mColorPickerInternalOpen = true;
        let position = mButtons[Buttons.COLOR_BUTTON].getPosition();
        openColorPicker({ x: position.x + BUTTON_SIZE * 0.5, y: position.y - BUTTON_SIZE * 0.5 });
    }

    function showColorPicker(coords) {
        mColorPickerInternalOpen = false;
        openColorPicker(coords)
    }

    function openColorPicker(coords) {
        mColorPickerContainer.style("left", coords.x + "px").style("top", coords.y + "px");
        mColorPicker.openHandler();
    }

    return {
        onResize,
        activateButton,
        deactivateButton,
        deactivateAll,
        showColorPicker,
        setColorChangeCallback: (func) => mColorChangeCallback = func,
        setColorPickedCallback: (func) => mColorPickedCallback = func,
        setOnClickCallback: (func) => mOnClickCallack = func,
    }
}
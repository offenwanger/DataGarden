function ContextMenu(svg) {
    let mContextMenuId = "context-menu";
    let mButtonData = {}
    let mSvg = svg;

    mButtonData[ContextButtons.ADD_DIMENSION_FOR_FORM] = {
        id: ContextButtons.ADD_DIMENSION_FOR_FORM,
        img: "img/bind_form_button.svg",
        tooltip: "Bind a new dimension to the form channel",
    }
    mButtonData[ContextButtons.ADD_DIMENSION_FOR_COLOR] = {
        id: ContextButtons.ADD_DIMENSION_FOR_COLOR,
        img: "img/bind_color_button.svg",
        tooltip: "Bind a new dimension to the color channel",
    }
    mButtonData[ContextButtons.ADD_DIMENSION_FOR_SIZE] = {
        id: ContextButtons.ADD_DIMENSION_FOR_SIZE,
        img: "img/bind_size_button.svg",
        tooltip: "Bind a new dimension to the size channel",
    }
    mButtonData[ContextButtons.ADD_DIMENSION_FOR_ANGLE] = {
        id: ContextButtons.ADD_DIMENSION_FOR_ANGLE,
        img: "img/bind_angle_button.svg",
        tooltip: "Bind a new dimension to the angle channel",
    }
    mButtonData[ContextButtons.ADD_DIMENSION_FOR_POSITION] = {
        id: ContextButtons.ADD_DIMENSION_FOR_POSITION,
        img: "img/bind_position_button.svg",
        tooltip: "Bind a new dimension to the position channel",
    }
    mButtonData[ContextButtons.MERGE_TO_ELEMENT] = {
        id: ContextButtons.MERGE_TO_ELEMENT,
        img: "img/merge_elements.svg",
        tooltip: "Merge these strokes into a new element",
    }
    mButtonData[ContextButtons.AUTO_MERGE_ELEMENTS] = {
        id: ContextButtons.AUTO_MERGE_ELEMENTS,
        img: "img/smart_merge.svg",
        tooltip: "Automatically detect elements and merge strokes",
    }
    mButtonData[ContextButtons.SPINE] = {
        id: ContextButtons.SPINE,
        img: "img/fit_spine.svg",
        tooltip: "Recalculate element spine and strip",
    }
    mButtonData[ContextButtons.STYLE_STRIP] = {
        id: ContextButtons.STYLE_STRIP,
        img: "img/style_strip.svg",
        tooltip: "Style element using calculated strip",
    }
    mButtonData[ContextButtons.STYLE_STROKES] = {
        id: ContextButtons.STYLE_STROKES,
        img: "img/style_strokes.svg",
        tooltip: "Style element using it's strokes",
    }

    function showContextMenu(pos, buttons, callback) {
        hideContextMenu();
        let buttonData = buttons.filter(b => {
            if (!mButtonData[b]) {
                console.error("Not a supported button id", b);
                return false;
            }
            return true;
        });
        if (buttonData.length == 0) { console.error("No valid buttons provided"); return; }
        buttonData = buttonData.map(b => mButtonData[b]);
        let contextMenu = new RadialContextMenu(mSvg, mContextMenuId, buttonData, 40);
        contextMenu.onClick((id) => {
            if (id == ContextButtons.CENTER) {
                hideContextMenu();
            } else {
                callback(id);
            }
        })
        contextMenu.setPosition(pos.x, pos.y);
        contextMenu.show();
    }

    function hideContextMenu() {
        d3.select("#" + mContextMenuId).remove();
    }

    return {
        showContextMenu,
        hideContextMenu,
    }
}
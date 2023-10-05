function ContextMenuController(svg) {
    let mContextMenuId = "context-menu";
    let mButtonData = {}
    let mSvg = svg;

    mButtonData[ContextButtons.ADD_DIMENTION_FOR_FORM] = {
        id: ContextButtons.ADD_DIMENTION_FOR_FORM,
        img: "img/add_dimention.svg",
        tooltip: "Bind a new dimention to the form channel",
    }
    mButtonData[ContextButtons.ADD_DIMENTION_FOR_COLOR] = {
        id: ContextButtons.ADD_DIMENTION_FOR_COLOR,
        img: "img/add_dimention.svg",
        tooltip: "Bind a new dimention to the color channel",
    }
    mButtonData[ContextButtons.ADD_DIMENTION_FOR_SIZE] = {
        id: ContextButtons.ADD_DIMENTION_FOR_SIZE,
        img: "img/add_dimention.svg",
        tooltip: "Bind a new dimention to the size channel",
    }
    mButtonData[ContextButtons.ADD_DIMENTION_FOR_ORIENTATION] = {
        id: ContextButtons.ADD_DIMENTION_FOR_ORIENTATION,
        img: "img/add_dimention.svg",
        tooltip: "Bind a new dimention to the orientation channel",
    }
    mButtonData[ContextButtons.ADD_DIMENTION_FOR_POSITION] = {
        id: ContextButtons.ADD_DIMENTION_FOR_POSITION,
        img: "img/add_dimention.svg",
        tooltip: "Bind a new dimention to the position channel",
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
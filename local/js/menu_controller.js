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
        mPanButton = new MenuButton("pan-button", svg, "img/panning_button.svg")
        mZoomButton = new MenuButton("zoom-button", svg, "img/zoom_button.svg")
        mZoomButton.isSubButton(20, 10)
        mBrushButton = new MenuButton("brush-button", svg, "img/color_brush_button.svg")
        mSelectionButton = new MenuButton("selection-button", svg, "img/selection_button.svg")
        mViewButton = new MenuButton("view-button", svg, "img/eyecon_button.svg")

        mPlayButton = new MenuButton("play-button", svg, "img/play_button.svg")
        mPlayButton.hide();
        mPlayButton.setOnClickCallback(() => {
            mPlayButton.hide();
            mPauseButton.show();
            mPauseCallback(false);
        })
        mPauseButton = new MenuButton("pause-button", svg, "img/pause_button.svg")
        mPauseButton.setOnClickCallback(() => {
            mPlayButton.show();
            mPauseButton.hide();
            mPauseCallback(true);
        })

        mColorSelectorButton = new MenuButton("color-button", svg, "img/color_selector.svg", () => {
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

        defineFilters(svg);

        mGroupContextMenu = new RadialContextMenu(svg, [{
            id: ContextButtons.ADD_DIMENTION,
            img: "img/color_brush_button.svg"
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

    function MenuButton(id, svg, img, onLoad) {
        let mClickCallback = () => { };

        let mButton = svg.append('g')
            .attr("id", id);
        let mSvg = mButton.append('g')
            .attr("filter", "url(#dropshadow)");
        let mOverlay = mButton.append("rect")
            .classed("button-overlay", true)
            .attr("height", BUTTON_SIZE)
            .attr("width", BUTTON_SIZE)
            .attr("opacity", 0)
            .on('pointerup', () => { mClickCallback(); });

        d3.xml(img).then(data => {
            let width = data.documentElement.getAttribute('width');
            let scale = BUTTON_SIZE / width;
            mSvg.attr("transform", "scale(" + scale + " " + scale + ")")
            mSvg.node().append(data.documentElement);
            onLoad ? onLoad() : null;
        }).catch(() => {
            // Failed to load XML, we are probably not on the server, getting images instead
            mSvg.append("image")
                .attr("href", img)
                .attr("height", BUTTON_SIZE)
                .attr("width", BUTTON_SIZE);
        });

        let mOffsetX = 0;
        let mOffsetY = 0;

        function setPosition(x, y) {
            mButton.attr("transform", "translate(" + (x - BUTTON_SIZE / 2 + mOffsetX) + "," + (y - BUTTON_SIZE / 2 + mOffsetY) + ")");
        }

        function isSubButton(offsetX, offsetY) {
            mButton.lower();
            mOffsetX = offsetX;
            mOffsetY = offsetY;
            hide();
        }

        function setActive(active) {
            if (active) {
                mButton.attr("filter", "url(#outline)")
            } else {
                mButton.attr("filter", "url(#dropshadow)")
            }
        }

        function hide() {
            mButton.style("display", "none");
        }

        function show() {
            mButton.style("display", "");

        }

        this.setPosition = setPosition;
        this.isSubButton = isSubButton;
        this.hide = hide;
        this.show = show;
        this.setActive = setActive;
        this.setOnClickCallback = (func) => mClickCallback = func;
    }

    function RadialContextMenu(svg, items, buttonSize) {
        const BUTTON_PADDING = 10;
        const MIN_BUTTONS = 5;

        let mMenuContainer = svg.append("g");
        let mClickCallback = () => { };

        let radius = buttonSize + BUTTON_PADDING * 2;
        let buttonCenterDist = buttonSize / 2 + BUTTON_PADDING;
        let innerRadius = BUTTON_PADDING;
        let angle = (2 * Math.PI) / Math.max(MIN_BUTTONS, items.length);
        if (angle < Math.PI) {
            buttonCenterDist = buttonSize / Math.sin(angle / 2);
            radius = buttonCenterDist + buttonSize / 2 + BUTTON_PADDING;
            innerRadius = buttonCenterDist - buttonSize / 2 - BUTTON_PADDING;
        }

        if (items.length >= MIN_BUTTONS) {
            let shadowCircleD = "M" + -radius + ",0 " +
                "A" + Math.round(radius) + "," + Math.round(radius) + ",0,1,0," + -radius + ",-1 " +
                "Z" +
                "M" + -innerRadius + ",0 " +
                "A" + Math.round(innerRadius) + "," + Math.round(innerRadius) + ",0,1,0," + -innerRadius + ",-1 " +
                "Z"
            mMenuContainer.append('path')
                .attr("d", shadowCircleD)
                .attr('fill', "#FFFFFF00")
                .attr('stroke', "#000000")
                .attr('stroke-width', "3")
                .attr("filter", "url(#dropshadow)")
                .on("pointerdown", function (event) {
                    mClickCallback(ContextButtons.CENTER);
                    event.stopPropagation();
                });
        }

        for (let i = 0; i < items.length; i++) {
            let a = i * angle;
            let a2 = (i + 1) * angle;
            let aMid = (i + 0.5) * angle;
            let p1 = { x: Math.round(radius * Math.cos(a)), y: Math.round(radius * Math.sin(a)) }
            let p2 = { x: Math.round(radius * Math.cos(a2)), y: Math.round(radius * Math.sin(a2)) }
            let p3 = { x: Math.round(innerRadius * Math.cos(a2)), y: Math.round(innerRadius * Math.sin(a2)) }
            let p4 = { x: Math.round(innerRadius * Math.cos(a)), y: Math.round(innerRadius * Math.sin(a)) }

            let pImg = { x: Math.round(buttonCenterDist * Math.cos(aMid)), y: Math.round(buttonCenterDist * Math.sin(aMid)) }
            let d = "M" + p1.x + "," + p1.y + " "
            d += "A" + Math.round(radius) + "," + Math.round(radius) + ",0,0,1," + p2.x + "," + p2.y + " ";
            d += "L" + p3.x + "," + p3.y + " "
            d += "A" + Math.round(innerRadius) + "," + Math.round(innerRadius) + ",0,0,0," + p4.x + "," + p4.y + " ";
            d += "Z";
            let tile = mMenuContainer.append("g")
                .on('pointerover', function () {
                    d3.select(this)
                        .raise()
                        .attr("filter", "url(#dropshadow)");
                }).on('pointerleave', function () {
                    d3.select(this).attr("filter", "");
                }).on('pointerdown', function (event) {
                    d3.select(this).attr("filter", "");
                    mClickCallback(items[i].id);
                    event.stopPropagation();
                }).on('pointerup', function () {
                    d3.select(this).attr("filter", "url(#dropshadow)");
                });
            tile.append("path")
                .attr("id", items[i].id)
                .attr("d", d)
                .attr("stroke", "black")
                .attr("stroke-width", 3)
                .attr('fill', 'white')
            tile.append("image")
                .attr("x", pImg.x - buttonSize / 2)
                .attr("y", pImg.y - buttonSize / 2)
                .attr("href", items[i].img)
                .attr("height", buttonSize)
                .attr("width", buttonSize);
        }

        function setPosition(x, y) {
            mMenuContainer.attr("transform", "translate(" + x + "," + y + ")")
        }

        function show() {
            mMenuContainer.style('display', '');
        }

        function hide() {
            mMenuContainer.style('display', 'none');
        }

        this.setPosition = setPosition;
        this.show = show;
        this.hide = hide;
        this.onClick = (func) => mClickCallback = func;
    }

    function defineFilters(svg) {
        const defs = (svg.select('defs').node()
            ? svg.select('defs')
            : svg.append("defs"))
        const shadow = defs.append("filter")
            .attr("id", "dropshadow")
            .attr("y", "-40%")
            .attr("height", "180%")
            .attr("x", "-40%")
            .attr("width", "180%")
        shadow.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 4)
            .attr("result", "blur");
        shadow.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 2)
            .attr("dy", 2)
            .attr("result", "offsetBlur");
        const feMerge = shadow.append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur")
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");


        const outline = defs.append("filter")
            .attr("id", "outline")
            .attr("y", "-40%")
            .attr("height", "180%")
            .attr("x", "-40%")
            .attr("width", "180%")
        outline.append("feMorphology")
            .attr("in", "SourceAlpha")
            .attr("operator", "dilate")
            .attr("radius", "3")
            .attr("result", "expanded");
        outline.append("feFlood")
            .attr("flood-color", "green")
            .attr("result", "color");
        outline.append("feComposite")
            .attr("in", "color")
            .attr("in2", "expanded")
            .attr("operator", "in")
        outline.append("feComposite")
            .attr("in", "SourceGraphic");
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
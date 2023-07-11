function MenuController(svg) {
    const BUTTON_SIZE = 40;

    let mBrushButton;
    let mSelectionButton;
    let mPanButton;
    let mZoomButton;

    function createInterface(svg) {
        mPanButton = new MenuButton(svg, "img/panning_button.svg")
        mZoomButton = new MenuButton(svg, "img/zoom_button.svg")
        mZoomButton.isSubButton(20, 10)
        mBrushButton = new MenuButton(svg, "img/color_brush_button.svg")
        mSelectionButton = new MenuButton(svg, "img/selection_button.svg")

        defineFilters(svg);
        layout(svg);
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
        } else {
            console.error("Invalid deactivate button id: " + buttonId)
        }
    }

    function showButton(buttonId) {
        if (buttonId == Buttons.ZOOM_BUTTON) {
            mZoomButton.setVisible(true)
        } else {
            console.error("Invalid show button id: " + buttonId)
        }
    }

    function hideButton(buttonId) {
        if (buttonId == Buttons.ZOOM_BUTTON) {
            mZoomButton.setVisible(false)
        } else {
            console.error("Invalid hide button id: " + buttonId)
        }
    }

    function layout(svg) {
        let buttonSpacing = BUTTON_SIZE * 1.5;

        mBrushButton.setPosition(buttonSpacing * 2.5, svg.attr("height") - BUTTON_SIZE);
        mSelectionButton.setPosition(buttonSpacing * 1.5, svg.attr("height") - BUTTON_SIZE);
        mPanButton.setPosition(buttonSpacing * 0.5, svg.attr("height") - BUTTON_SIZE);
        mZoomButton.setPosition(buttonSpacing * 0.5, svg.attr("height") - BUTTON_SIZE);
    }

    function MenuButton(svg, img) {
        let mButton = svg.append("image")
            .attr("height", BUTTON_SIZE)
            .attr("width", BUTTON_SIZE)
            .attr("href", img)
            .attr("filter", "url(#dropshadow)")
        let mOffsetX = 0;
        let mOffsetY = 0;

        function setPosition(x, y) {
            mButton.attr("x", x - BUTTON_SIZE / 2).attr("y", y - BUTTON_SIZE / 2);
        }

        function isSubButton(offsetX, offsetY) {
            mButton.lower();
            mOffsetX = offsetX;
            mOffsetY = offsetY;
            setVisible(false);
        }

        function setActive(active) {
            if (active) {
                mButton.attr("filter", "url(#outline)")
            } else {
                mButton.attr("filter", "url(#dropshadow)")
            }
        }

        function setVisible(visible) {
            if (visible) {
                mButton.attr("opacity", 100);
                mButton.attr("transform", "translate(" + mOffsetX + " " + mOffsetY + ")")
            } else {
                mButton.attr("opacity", 0);
                mButton.attr("transform", "")
            }
        }

        this.setPosition = setPosition;
        this.isSubButton = isSubButton;
        this.setVisible = setVisible;
        this.setActive = setActive;
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

    createInterface(svg);

    return {
        onResize: (svg) => layout(svg),
        stateTransition,
    }
}
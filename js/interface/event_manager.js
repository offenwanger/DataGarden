/**
 * Listens to all events including buttons, maintains state, and passes commands back to main 
 */

function EventManager() {
    let mInteractionCanvas = d3.select('#canvas_container').append('canvas')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)
        .attr('id', 'interaction-canvas')
    let mInterface = d3.select('#interface_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight);

    let mMenuInterface = new MenuInterface(mInterface);
    let mCurrentToolState = Buttons.SELECTION_BUTTON;

    let mKeysDown = [];
    let mKeyBindingArray = [
        [Buttons.BRUSH_BUTTON, "d"],
        [Buttons.SELECTION_BUTTON, "s"],
        [Buttons.PANNING_BUTTON, "a"],
        [Buttons.ZOOM_BUTTON, "a", "s"],
    ]

    let mZoomCallback = () => { };
    let mResizeCallback = () => { };
    let mStrokeCallback = () => { };

    let mPanZoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", ({ transform }) => {
            mZoomCallback(transform);
        });
    let mZoomStartPos = false;

    let mBrushOptions = {
        size: 10,
        color: "#000000FF",
        currentStroke: [{ x: 0, y: 0 }]
    }
    let mBrushDown = false;

    window.addEventListener('resize', () => {
        mInteractionCanvas.attr('width', window.innerWidth)
            .attr('height', window.innerHeight);
        mInterface.attr('width', window.innerWidth)
            .attr('height', window.innerHeight);

        mResizeCallback()
    });

    $(document).on('keydown', function (e) {
        if (e.originalEvent.repeat) return;
        // we can sometimes still get a double down, so check for that to. 
        if (mKeysDown.includes(e.originalEvent.key)) return;
        mKeysDown.push(e.originalEvent.key)

        updateState();
    });

    $(document).on('keyup', function (e) {
        mKeysDown = mKeysDown.filter(i => i !== e.originalEvent.key);
        updateState();
    });

    mInterface.on("pointerdown", (e) => {
        if (mCurrentToolState == Buttons.ZOOM_BUTTON) {
            holdState();
            mZoomStartPos = {
                pointerX: e.clientX,
                pointerY: e.clientY,
                transformX: getZoom().x,
                transformY: getZoom().y,
                scale: getZoom().k
            };
        } else if (mCurrentToolState == Buttons.BRUSH_BUTTON) {
            holdState();
            mBrushDown = true;
        }
    });
    $(document).on('pointermove', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        if (mCurrentToolState == Buttons.ZOOM_BUTTON) {
            if (mZoomStartPos) {
                let scale = mZoomStartPos.scale * (1 + (screenCoords.y - mZoomStartPos.pointerY) / mInterface.attr('height'));
                let zoomChange = scale - mZoomStartPos.scale;
                let zoomCenter = screenToModelCoords({ x: mZoomStartPos.pointerX, y: mZoomStartPos.pointerY })
                let transformX = -(zoomCenter.x * zoomChange) + mZoomStartPos.transformX;
                let transformY = -(zoomCenter.y * zoomChange) + mZoomStartPos.transformY;
                let transform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
                mInterface.call(mPanZoom.transform, transform);
                mZoomCallback(transform);
            }
        } if (mCurrentToolState == Buttons.BRUSH_BUTTON) {
            let localCoords = screenToModelCoords(screenCoords);
            if (mBrushDown) {
                mBrushOptions.currentStroke.push(localCoords);
            } else {
                mBrushOptions.currentStroke = [localCoords];
            }
            redrawInterface();
        }
    });
    $(document).on('pointerup', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        if (mCurrentToolState == Buttons.ZOOM_BUTTON) {
            mZoomStartPos = null;
            releaseState();
        } if (mCurrentToolState == Buttons.BRUSH_BUTTON) {
            mBrushDown = false;

            mStrokeCallback(mBrushOptions.currentStroke, mBrushOptions.size, mBrushOptions.color)
            mBrushOptions.currentStroke = [screenToModelCoords(screenCoords)];

            releaseState();
        }
    });

    let mLockedState = false;
    function holdState() { mLockedState = true; }
    function releaseState() {
        mLockedState = false;
        updateState();
    }

    function updateState() {
        if (mLockedState) return;
        let keyState = getStateFromInput(mKeysDown);
        if (keyState != mCurrentToolState) {
            stateTransition(mCurrentToolState, keyState);
            mCurrentToolState = keyState;
            updateInterface(mCurrentToolState);
        }
    }

    function stateTransition(oldState, newState) {
        if (isChildButton(newState, oldState) || isChildButton(oldState, newState)) {
            mMenuInterface.deactivateButton(oldState)
            mMenuInterface.activateButton(newState);
        } else {
            mMenuInterface.deactivateButton(oldState)
            oldState = getParentButton(oldState) ? getParentButton(oldState) : oldState;
            getChildButtons(oldState).forEach(b => mMenuInterface.hideButton(b));

            mMenuInterface.activateButton(newState)
            getChildButtons(newState).forEach(b => mMenuInterface.showButton(b));
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

    function updateInterface(newState) {
        clearInterfaceState();
        if (newState == Buttons.PANNING_BUTTON) {
            mInterface.call(mPanZoom);
        } else if (newState == Buttons.BRUSH_BUTTON) {
            // nothing needed
        } else if (newState == Buttons.SELECTION_BUTTON) {
            console.error("newState == Buttons.SELECTION_BUTTON: Unimplemented!")
        } else if (newState == Buttons.ZOOM_BUTTON) {
            // nothing needed
        } else {
            console.error("State not valid! " + newState);
        }

        redrawInterface();
    }

    function clearInterfaceState() {
        mInterface.on('.zoom', null);
    }

    function redrawInterface() {
        let ctx = mInteractionCanvas.node().getContext("2d");
        ctx.clearRect(0, 0, mInteractionCanvas.attr("width"), mInteractionCanvas.attr("height"));
        ctx.save();

        let zoom = getZoom();
        ctx.translate(zoom.x, zoom.y)
        ctx.scale(zoom.k, zoom.k)

        if (mCurrentToolState == Buttons.BRUSH_BUTTON) {
            ctx.strokeStyle = mBrushOptions.color;
            ctx.lineWidth = mBrushOptions.size;

            ctx.beginPath();
            ctx.moveTo(mBrushOptions.currentStroke[0].x - 1, mBrushOptions.currentStroke[0].y - 1);
            mBrushOptions.currentStroke.forEach(p => ctx.lineTo(p.x, p.y));

            ctx.stroke();
        }

        ctx.restore();
    }

    function screenToModelCoords(screenCoords) {
        let boundingBox = mInterface.node().getBoundingClientRect();
        let zoomPan = getZoom();
        if (checkConvertionState(screenCoords, boundingBox, zoomPan)) {
            return {
                x: (screenCoords.x - boundingBox.x - zoomPan.x) / zoomPan.k,
                y: (screenCoords.y - boundingBox.y - zoomPan.y) / zoomPan.k
            };
        } else {
            return { x: 0, y: 0 };
        }
    }

    function modelToScreenCoords(modelCoords) {
        let boundingBox = mInterface.node().getBoundingClientRect();
        let zoomPan = getZoom();
        if (checkConvertionState(screenCoords, boundingBox, zoomPan)) {
            return {
                x: (modelCoords.x * zoomPan.k) + boundingBox.x + zoomPan.x,
                y: (modelCoords.y * zoomPan.k) + boundingBox.y + zoomPan.y
            };
        } else {
            return { x: 0, y: 0 };
        }
    }

    function checkConvertionState(coords, boundingBox, zoomPan) {
        if (isNaN(parseInt(coords.x)) || isNaN(parseInt(coords.y))) {
            console.error('Bad conversion coords', coords);
            return false;
        }

        if (isNaN(parseInt(boundingBox.x)) || isNaN(parseInt(boundingBox.y))) {
            console.error('Bad canvas bounding box!', boundingBox);
            return false;
        }

        if (isNaN(parseInt(zoomPan.x)) || isNaN(parseInt(zoomPan.y))) {
            console.error('Bad transform state!', zoomPan);
            return false;
        }

        return true;
    }

    function getStateFromInput(keysDown) {
        let keys = [...mKeysDown];
        let validStates = mKeyBindingArray;
        let checkIndex = 1;
        let found = false;
        while (keys.length > 0) {
            if (mKeyBindingArray.filter(i => i[checkIndex] == keys[0]).length > 0) {
                found = true;
                validStates = mKeyBindingArray.filter(i => i[checkIndex] == keys[0]);
                checkIndex++
            }
            keys.shift();
        }
        if (found) {
            return validStates.reduce(function (p, c) { return p.length > c.length ? c : p; }, { length: Infinity })[0];
        } else {
            return Buttons.SELECTION_BUTTON;
        }
    }

    function getZoom() {
        return d3.zoomTransform(mInterface.node());
    }

    /** useful test and development function: */
    // $(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     console.log(e.type, e, { x: e.clientX, y: e.clientY }, screenToModelCoords({ x: e.clientX, y: e.clientY }))
    // });

    return {
        onZoom: (func) => mZoomCallback = func,
        onResize: (func) => mResizeCallback = func,
        onStroke: (func) => mStrokeCallback = func,
        getZoom,
    }
}


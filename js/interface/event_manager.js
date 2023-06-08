/**
 * Listens to all events including buttons, maintains state, and passes commands back to main 
 */

function EventManager() {
    let mInteractionCanvas = d3.select('#canvas_container').append('canvas')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)
    let mInterface = d3.select('#interface_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight);

    let mViewTransform = { x: 0, y: 0, scale: 1 };

    let mMenuInterface = new MenuInterface(mInterface);
    let mKeysDown = [];

    let mCurrentToolState = Buttons.SELECTION_BUTTON;

    let mKeyBindingArray = [
        [Buttons.BRUSH_BUTTON, "d"],
        [Buttons.SELECTION_BUTTON, "s"],
        [Buttons.PANNING_BUTTON, "a"],
        [Buttons.ZOOM_BUTTON, "a", "s"],
    ]

    let mZoomCallback = () => { };
    let mResizeCallback = () => { };

    let mPanZoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", ({ transform }) => {
            mZoomCallback(transform);
        });
    let mZoomStartPos = false;

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

    function updateState() {
        let keyState = getStateFromInput(mKeysDown);
        if (keyState != mCurrentToolState) {
            stateTransition(mCurrentToolState, keyState);
            mCurrentToolState = keyState;
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

        setState(newState);
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

    function setState(newState) {
        clearState();
        if (newState == Buttons.PANNING_BUTTON) {
            mInterface.call(mPanZoom);
        } else if (newState == Buttons.ZOOM_BUTTON) {
            mInterface.on("pointerdown", (e) => {
                let transform = currentZoom();
                mZoomStartPos = {
                    pointerX: e.clientX,
                    pointerY: e.clientY,
                    transformX: transform.x,
                    transformY: transform.y,
                    scale: transform.k
                };
            });
            mInterface.on('pointermove', (e) => {
                if (mZoomStartPos) {
                    let scale = mZoomStartPos.scale * (1 + (e.clientY - mZoomStartPos.pointerY) / mInterface.attr('height'));
                    let zoomChange = scale - mZoomStartPos.scale;
                    let zoomCenter = screenToModelCoords({ x: mZoomStartPos.pointerX, y: mZoomStartPos.pointerY })
                    let transformX = -(zoomCenter.x * zoomChange) + mZoomStartPos.transformX;
                    let transformY = -(zoomCenter.y * zoomChange) + mZoomStartPos.transformY;
                    let transform = d3.zoomIdentity.translate(transformX, transformY).scale(scale);
                    mInterface.call(mPanZoom.transform, transform);
                    mZoomCallback(transform);
                }
            });
            mInterface.on('pointerup', (e) => {
                mZoomStartPos = null;
            });
        } else if (newState == Buttons.SELECTION_BUTTON) {
            console.error("newState == Buttons.SELECTION_BUTTON: Unimplemented!")
        } else {
            console.error("State not valid! " + newState);
        }
    }

    function clearState() {
        mInterface.on('.zoom', null);
        mInterface.on('pointerdown', null);
        mInterface.on('pointermove', null);
        mInterface.on('pointerup', null);
    }

    function screenToModelCoords(screenCoords) {
        let boundingBox = mInterface.node().getBoundingClientRect();
        let zoomPan = currentZoom();
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
        let zoomPan = currentZoom();
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

    function currentZoom() {
        return d3.zoomTransform(mInterface.node());
    }

    /** useful test and development function: */
    // $(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     console.log(e.type, e, { x: e.clientX, y: e.clientY }, screenToModelCoords({ x: e.clientX, y: e.clientY }))
    // });

    return {
        onZoom: (func) => mZoomCallback = func,
        onResize: (func) => mResizeCallback = func,
    }
}


/**
 * Listens to all events including buttons, maintains state, and passes commands back to main 
 */

function EventManager(strokeController, vemController, structController, tableController) {
    let mStrokeController = strokeController;
    let mVemController = vemController;
    let mStructController = structController;
    let mTableController = tableController;

    let mHorizontalBarPercent = 0.5;
    let mVerticalBarPercent = 0.5;

    let mInterface = d3.select('#interface-container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight);

    let mMenuController = new MenuController(mInterface);
    let mCurrentToolState = Buttons.SELECTION_BUTTON;

    let mKeysDown = [];
    let mKeyBindingArray = [
        [Buttons.BRUSH_BUTTON, "d"],
        [Buttons.SELECTION_BUTTON, "s"],
        [Buttons.PANNING_BUTTON, "a"],
        [Buttons.ZOOM_BUTTON, "a", "s"],
    ]

    let mActiveController = null;
    let mZoomStartPos = false;
    let mPanStartPosition = false;
    let mBrushDown = false;

    window.addEventListener('resize', () => {
        mStrokeController.onResize(window.innerWidth * mVerticalBarPercent, window.innerHeight * mHorizontalBarPercent);
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
        let pointerCoord = { x: e.clientX, y: e.clientY, };
        mActiveController = getActiveController(pointerCoord);
        if (mCurrentToolState == Buttons.PANNING_BUTTON &&
            mActiveController != mTableController) {
            holdState();
            mPanStartPosition = pointerCoord;
            mActiveController.onPanStart(pointerCoord);
        } else if (mCurrentToolState == Buttons.ZOOM_BUTTON &&
            mActiveController != mTableController) {
            holdState();
            mZoomStartPos = pointerCoord;
            mActiveController.onZoomStart(pointerCoord);
        } else if (mCurrentToolState == Buttons.BRUSH_BUTTON &&
            mActiveController == mStrokeController) {
            holdState();
            mStrokeController.onBrushStart();
            mBrushDown = true;
        }
    });
    $(document).on('pointermove', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        if (mCurrentToolState == Buttons.PANNING_BUTTON) {
            if (mPanStartPosition) {
                let mouseDist = MathUtil.subtract(screenCoords, mPanStartPosition);
                mActiveController.onPan(mouseDist);
            }
        } else if (mCurrentToolState == Buttons.ZOOM_BUTTON) {
            if (mZoomStartPos) {
                let mouseDist = screenCoords.y - mZoomStartPos.y;
                mActiveController.onZoom(mouseDist);
            }
        } else if (mCurrentToolState == Buttons.BRUSH_BUTTON) {
            if (mBrushDown) {
                mStrokeController.onBrush(screenCoords);
            } else {
                mStrokeController.onBrushMove(screenCoords);
            }
        }
    });
    $(document).on('pointerup', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        if (mCurrentToolState == Buttons.PANNING_BUTTON) {
            mActiveController.onPanEnd();
            mPanStartPosition = null;
            releaseState();
        } else if (mCurrentToolState == Buttons.ZOOM_BUTTON) {
            mActiveController.onZoomEnd();
            mZoomStartPos = null;
            releaseState();
        } else if (mCurrentToolState == Buttons.BRUSH_BUTTON) {
            if (mBrushDown) {
                mBrushDown = false;
                mStrokeController.onBrushEnd(screenCoords);
                releaseState();
            }
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
            mMenuController.stateTransition(mCurrentToolState, keyState);
            mCurrentToolState = keyState;

            clearInterfaceState();
            if (mCurrentToolState == Buttons.PANNING_BUTTON) {
                mStrokeController.setPanActive(true);
            } else if (mCurrentToolState == Buttons.BRUSH_BUTTON) {
                mStrokeController.setBrushActive(true);
            } else if (mCurrentToolState == Buttons.SELECTION_BUTTON) {
                console.error("newState == Buttons.SELECTION_BUTTON: Unimplemented!")
            } else if (mCurrentToolState == Buttons.ZOOM_BUTTON) {
                // nothing needed
            } else {
                console.error("State not valid! " + mCurrentToolState);
            }
        }
    }

    function clearInterfaceState() {
        mStrokeController.setBrushActive(false);

        mStrokeController.setPanActive(false);
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

    function getActiveController(screenCoords) {
        let leftRightDivide = mVerticalBarPercent * window.innerWidth;
        let topBottomDivide = mHorizontalBarPercent * window.innerHeight;

        if (screenCoords.x < leftRightDivide && screenCoords.y < topBottomDivide) {
            return mStrokeController;
        } else if (screenCoords.x < leftRightDivide) {
            return mStructController;
        } else if (screenCoords.y < topBottomDivide) {
            return mVemController;
        } else {
            return mTableController;
        }
    }

    /** useful test and development function: */
    // $(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     console.log(e.type, e, { x: e.clientX, y: e.clientY }, screenToModelCoords({ x: e.clientX, y: e.clientY }))
    // });

    return {

    }
}


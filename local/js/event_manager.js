/**
 * Listens to all events including buttons, maintains state, and passes commands back to main 
 */

function EventManager(strokeController, fdlController) {
    let mStrokeViewController = strokeController;
    let mFdlViewController = fdlController;

    let mHorizontalBarPercent = 0.5;
    let mVerticalBarPercent = 0.5;

    let mInterface = d3.select('#interface-container').append('svg')
        .attr('id', 'interface-svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)

    let mMenuController = new MenuController(mInterface);
    let mCurrentToolState = Buttons.SELECTION_BUTTON;

    let mCurrentMousePosistion;
    let mLongPressTimeout;

    let mKeysDown = [];
    let mKeyBindingArray = [
        [Buttons.BRUSH_BUTTON, "d"],
        [Buttons.SELECTION_BUTTON, "s"],
        [Buttons.PANNING_BUTTON, "a"],
        [Buttons.ZOOM_BUTTON, "a", "s"],
        [Buttons.VIEW_BUTTON, "f"],
    ]

    d3.select(window).on('resize', () => {
        mStrokeViewController.onResize(window.innerWidth * mVerticalBarPercent, window.innerHeight);
        mFdlViewController.onResize(window.innerWidth * mVerticalBarPercent, window.innerHeight);
        mInterface.attr('width', window.innerWidth).attr('height', window.innerHeight);
        mMenuController.onResize(window.innerWidth, window.innerHeight);
    });

    d3.select(document).on('keydown', function (e) {
        if (e.repeat) return;
        // we can sometimes still get a double down, so check for that to. 
        if (mKeysDown.includes(e.key)) return;
        mKeysDown.push(e.key)

        updateState();
    });

    d3.select(document).on('keyup', function (e) {
        mKeysDown = mKeysDown.filter(i => i !== e.key);
        updateState();
    });

    mInterface.on("pointerdown", (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY, };

        mStartPos = screenCoords;
        mCurrentMousePosistion = mStartPos;
        clearTimeout(mLongPressTimeout);
        mLongPressTimeout = setTimeout(() => {
            let motion = MathUtil.length(MathUtil.subtract(mStartPos, mCurrentMousePosistion));
            if (motion < 5) {
                // on long press
            }
        }, 800);

        let hold = mStrokeViewController.onPointerDown(screenCoords, mCurrentToolState);
        hold = hold || mFdlViewController.onPointerDown(screenCoords, mCurrentToolState);

        if (hold) { holdState(); }
    });
    d3.select(document).on('pointermove', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        mCurrentMousePosistion = screenCoords;

        mStrokeViewController.onPointerMove(screenCoords, mCurrentToolState);
        mFdlViewController.onPointerMove(screenCoords, mCurrentToolState);
    });

    d3.select(document).on('pointerup', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        mStrokeViewController.onPointerUp(screenCoords, mCurrentToolState);
        mFdlViewController.onPointerUp(screenCoords, mCurrentToolState);
        releaseState();
        clearTimeout(mLongPressTimeout);
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
        }
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

    /** useful test and development function: */
    // d3.select(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     console.log(e.type, e, { x: e.clientX, y: e.clientY }, screenToModelCoords({ x: e.clientX, y: e.clientY }))
    // });

    return {

    }
}


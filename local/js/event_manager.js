/**
 * Listens to global browser events 
 */

function EventManager(dashboard) {
    const DBL_CLICK_SPEED = 500;
    const DBL_CLICK_DIST = 10;

    let mDashboard = dashboard;


    let mLastClick = { x: -10, y: -10, time: Date.now() };
    let mCurrentToolState = Buttons.SELECTION_BUTTON;

    let mCurrentMousePosistion;
    let mLongPressTimeout;

    let mKeysDown = [];

    mDashboard.onResize(window.innerWidth, window.innerHeight);

    d3.select(window).on('resize', () => {
        mDashboard.onResize(window.innerWidth, window.innerHeight);
    });

    d3.select(document).on('keydown', function (e) {
        if (e.repeat) return;
        // we can sometimes still get a double down, so check for that to. 
        if (mKeysDown.includes(e.key)) return;
        mKeysDown.push(e.key)

        mDashboard.onKeyStateChange(mKeysDown);

        if ((e.ctrlKey || e.metaKey) && e.key == 'z') {
            // return the promise for syncronization control and testing purposes.
            return mDashboard.onUndo();
        } else if (((e.ctrlKey || e.metaKey) && e.key == 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key == 'z')) {
            // return the promise for syncronization control and testing purposes.
            return mDashboard.onRedo();
        } else if (/* delete */ e.which == 46) {
            mDashboard.onDelete();
        }
    });

    d3.select(document).on('keyup', function (e) {
        mKeysDown = mKeysDown.filter(i => i !== e.key);
        mDashboard.onKeyStateChange(mKeysDown);
    });

    d3.select("#interface-svg").on("pointerdown", (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY, };
        mStartPos = screenCoords;
        mCurrentMousePosistion = mStartPos;
        clearTimeout(mLongPressTimeout);
        mLongPressTimeout = setTimeout(() => {
            let motion = MathUtil.length(MathUtil.subtract(mStartPos, mCurrentMousePosistion));
            if (motion < 5) {
                mDashboard.onLongPress(screenCoords, mCurrentToolState);
            }
        }, 800);

        if (Date.now() - mLastClick.time < DBL_CLICK_SPEED && MathUtil.length(MathUtil.subtract(screenCoords, mLastClick)) < DBL_CLICK_DIST) {
            mDashboard.onDblClick(screenCoords, mCurrentToolState);
        } else {
            mDashboard.onPointerDown(screenCoords, mCurrentToolState);
        }
        mLastClick = { x: screenCoords.x, y: screenCoords.y, time: Date.now() };
    });

    d3.select(document).on('pointermove', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        mCurrentMousePosistion = screenCoords;
        mDashboard.onPointerMove(screenCoords, mCurrentToolState);
    });

    d3.select(document).on('pointerup', (e) => {
        let screenCoords = { x: e.clientX, y: e.clientY };
        mDashboard.onPointerUp(screenCoords, mCurrentToolState)
        clearTimeout(mLongPressTimeout);
    });

    /** useful test and development function: */
    // d3.select(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     console.log(e.type, e, { x: e.clientX, y: e.clientY }, screenToModelCoords({ x: e.clientX, y: e.clientY }))
    // });
}


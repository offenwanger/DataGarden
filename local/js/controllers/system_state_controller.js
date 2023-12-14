let SystemState = function () {
    let mStateArray = [
        [Buttons.BRUSH_BUTTON, "d"],
        [Buttons.SELECTION_BUTTON, "s"],
        [Buttons.PANNING_BUTTON, "a"],
        [Buttons.ZOOM_BUTTON, "a", "s"],
    ]

    let mKeys = [];
    let mDefaultState = Buttons.BRUSH_BUTTON;
    let mStructureViewActive = false;

    function setDefaultToolState(state) {
        mDefaultState = state;
    }

    function isDefaultToolState() {
        return getToolState() == mDefaultState;
    }

    function setKeys(keys) {
        mKeys = [...keys];
    }

    function getToolState() {
        let keys = [...mKeys];
        let validStates = mStateArray;
        let checkIndex = 1;
        let found = false;
        while (keys.length > 0) {
            if (mStateArray.filter(i => i[checkIndex] == keys[0]).length > 0) {
                found = true;
                validStates = mStateArray.filter(i => i[checkIndex] == keys[0]);
                checkIndex++
            }
            keys.shift();
        }
        if (found) {
            return validStates.reduce(function (p, c) { return p.length > c.length ? c : p; }, { length: Infinity })[0];
        } else {
            return mDefaultState;
        }
    }

    function isShift() {
        return mKeys.includes('shift');
    }

    function isCtrl() {
        return mKeys.includes('control');
    }

    function toggleStructureViewActive() {
        mStructureViewActive = !mStructureViewActive;
    }

    function isStructureViewActive() {
        return mStructureViewActive;
    }

    return {
        setDefaultToolState,
        isDefaultToolState,
        setKeys,
        getToolState,
        isShift,
        isCtrl,
        toggleStructureViewActive,
        isStructureViewActive,
    }
}
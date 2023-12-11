let KeyBinding = function () {
    let mKeyBindingArray = [
        [Buttons.BRUSH_BUTTON, "d"],
        [Buttons.SELECTION_BUTTON, "s"],
        [Buttons.PANNING_BUTTON, "a"],
        [Buttons.ZOOM_BUTTON, "a", "s"],
    ]

    function getState(keys) {
        keys = [...keys];
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
            return null;
        }
    }

    return {
        getState,
    }
}
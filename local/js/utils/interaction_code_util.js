let CodeUtil = function () {
    const NO_TYPE = 'no_type_specified';

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 100;

    function getId(hex) {
        if (mInteractionLookup[hex]) {
            if (mInteractionLookup[hex].type == NO_TYPE) {
                return mInteractionLookup[hex].id;
            } else {
                return mInteractionLookup[hex];
            }
        } else {
            return null;
        }
    }

    function getCode(id, type = NO_TYPE) {
        if (mReverseInteractionLookup[id + "_" + type]) {
            return mReverseInteractionLookup[id + "_" + type];
        } else {
            let code = DataUtil.numToColor(mColorIndex += 100);
            mInteractionLookup[code] = { id, type };
            mReverseInteractionLookup[id + "_" + type] = code;
            return code;
        }
    }

    function getTarget(screenCoords, interactionCanvas) {
        let boundingBox = interactionCanvas.node().getBoundingClientRect();
        let ctx = interactionCanvas.node().getContext('2d');
        let p = ctx.getImageData(screenCoords.x - boundingBox.x, screenCoords.y - boundingBox.y, 1, 1).data;
        let hex = DataUtil.rgbToHex(p[0], p[1], p[2]);
        return getId(hex);
    }

    function clear() {
        mInteractionLookup = {};
        mReverseInteractionLookup = {};
        mColorIndex = 100;
    }

    return {
        getId,
        getCode,
        getTarget,
        clear,
    }
}
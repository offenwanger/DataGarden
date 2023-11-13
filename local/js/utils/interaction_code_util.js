let CodeUtil = function () {
    const NO_TYPE = 'no_type_specified';

    let mInteractionLookup = {};
    let mReverseInteractionLookup = {};
    let mColorIndex = 0;

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

    function clear() {
        mInteractionLookup = {};
        mReverseInteractionLookup = {};
        mColorIndex = 0;
    }

    return {
        getId,
        getCode,
        clear,
    }
}
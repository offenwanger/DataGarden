module.exports = function () {
    let mDocument = null;

    let jQueryFunc = function (selector) {
        if (selector == mDocument) return mDocument;
    }

    jQueryFunc.setDocument = function (document) {
        mDocument = document;
        mDocument.on = mDocument.addEventListener;
    }

    return jQueryFunc;
}
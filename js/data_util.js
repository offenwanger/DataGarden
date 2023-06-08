let DataUtil = function () {
    let counter = 0;
    function getUniqueId() {
        return counter + "_" + Date.now();
    }

    return {
        getUniqueId,
    }
}
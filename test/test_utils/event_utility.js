exports.DOMContentLoaded = function (integrationEnv) {
    let funcs = integrationEnv.globalAccessors.documentEventListeners["DOMContentLoaded"] || [];
    funcs.forEach(func => func());
}
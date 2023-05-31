exports.DOMContentLoaded = function (integrationEnv) {
    let funcs = integrationEnv.globals.documentEventListeners["DOMContentLoaded"] || [];
    funcs.forEach(func => func());
}
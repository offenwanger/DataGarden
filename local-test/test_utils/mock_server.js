module.exports = function () {
    let serverResult = { ok: false };

    return {
        fetch: () => Promise.resolve(serverResult),
        setServerResult: result => serverResult = result,
    };
}
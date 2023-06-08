
function CanvasContext() {
    this.save = function () { }
    this.clearRect = function () { }
    this.translate = function () { }
    this.scale = function () { }
    this.fillRect = function () { }
    this.restore = function () { }
}

module.exports = {
    getContext: () => new CanvasContext(),
}
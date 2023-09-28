module.exports = function () {
    this.time = 0;
    this.now = function () { return this.time };
}

function CanvasContext(width, height) {
    this.save = function () { };
    this.clearRect = function () { };
    this.translate = function () { };
    this.scale = function () { };
    this.fillRect = function () { };
    this.restore = function () { };
    this.getImageData = function (x, y, w, h) {
        return {
            data: [
                parseInt(this.array[x][y].substring(1, 3), 16),
                parseInt(this.array[x][y].substring(3, 5), 16),
                parseInt(this.array[x][y].substring(5, 7), 16),
            ]
        }
    };
    this.strokeStyle = "#000000FF"
    this.beginPath = function () { };
    this.stroke = function () { };
    this.clip = function () { };
    this.moveTo = function (x, y) {
        this.currX = x;
        this.currY = y;
    };
    this.lineTo = function (x, y) {
        let fromX = Math.max(0, Math.min(x, this.currX));
        let toX = Math.min(width, Math.max(x, this.currX));
        let fromY = Math.max(0, Math.min(y, this.currY));
        let toY = Math.min(height, Math.max(y, this.currY));

        for (let i = fromX; i < toX; i++) {
            for (let j = fromY; j < toY; j++) {
                this.array[i][j] = this.strokeStyle;
            }
        }

        this.currX = x;
        this.currY = y;
    };
    this.rect = function (x, y, w, h) {
        let fromX = Math.max(0, x);
        let toX = Math.min(width, x + w);
        let fromY = Math.max(0, y);
        let toY = Math.min(height, y + h);

        for (let i = fromX; i < toX; i++) {
            for (let j = fromY; j < toY; j++) {
                this.array[i][j] = this.strokeStyle;
            }
        }
    }

    this.array = new Array(width).fill(0).map(() => new Array(height).fill("#00000000"));
}

module.exports = {
    getContext: (w, h) => new CanvasContext(w, h),
}

function CanvasContext(width, height) {
    this.fillRect = function () { };
    this.beginPath = function () { };
    this.stroke = function () { };
    this.clip = function () { };
    this.setLineDash = function () { };
    this.saveStack = [];
    this.save = function () {
        this.saveStack.push({ translateX: this.translateX, translateY: this.translateY, scaleX: this.scaleX })
    };
    this.restore = function () {
        let vals = this.saveStack.pop();
        if (vals) {
            this.translateX = vals.translateX;
            this.translateY = vals.translateY;
            this.scaleX = vals.scaleX;
        }
    };
    this.getImageData = function (x, y, w, h) {
        return {
            data: [
                parseInt(this.array[x][y].substring(1, 3), 16),
                parseInt(this.array[x][y].substring(3, 5), 16),
                parseInt(this.array[x][y].substring(5, 7), 16),
            ]
        }
    };
    this.clearRect = function () {
        for (let i = 0; i < this.array.length; i++) {
            for (let j = 0; j < this.array[0].length; j++) {
                this.array[i][j] = '#00000000';
            }
        }
    };
    this.scale = function (x, y) {
        this.scaleX = x;
    };
    this.translateX = 0;
    this.translateY = 0;
    this.translate = function (x, y) {
        this.translateX += x;
        this.translateY += y;
    };
    this.moveTo = function (x, y) {
        this.currX = this.scaleX * x + this.translateX;
        this.currY = this.scaleX * y + this.translateY;
    };
    this.strokeStyle = "#000000FF"
    this.lineTo = function (x, y) {
        x = this.scaleX * x + this.translateX;
        y = this.scaleX * y + this.translateY;
        let fromX = Math.round(Math.max(0, Math.min(x, this.currX) - this.lineWidth));
        let toX = Math.round(Math.min(width, Math.max(x, this.currX) + this.lineWidth));
        let fromY = Math.round(Math.max(0, Math.min(y, this.currY) - this.lineWidth));
        let toY = Math.round(Math.min(height, Math.max(y, this.currY) + this.lineWidth));

        for (let i = fromX; i < toX; i++) {
            for (let j = fromY; j < toY; j++) {
                this.array[i][j] = this.strokeStyle;
            }
        }

        this.currX = x;
        this.currY = y;
    };
    this.rect = function (x, y, w, h) {
        let fromX = Math.max(0, x + this.translateX);
        let toX = Math.min(width, x + this.translateX + w);
        let fromY = Math.max(0, y + this.translateY);
        let toY = Math.min(height, y + this.translateY + h);

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
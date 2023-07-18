
function CanvasContext(width, height) {
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
    // drawing functions
    // we don't have separete x/y scales so we use ScaleX for everything
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
        let fromX = Math.max(0, this.scaleX * x + this.translateX);
        let toX = Math.min(width, this.scaleX * x + this.translateX + this.scaleX * w);
        let fromY = Math.max(0, this.scaleX * y + this.translateY);
        let toY = Math.min(height, this.scaleX * y + this.translateY + this.scaleX * h);

        for (let i = fromX; i < toX; i++) {
            for (let j = fromY; j < toY; j++) {
                this.array[i][j] = this.strokeStyle;
            }
        }
    }
    this.fillStyle = "#000000FF"
    this.fillRect = function (x, y, w, h) {
        let fromX = Math.max(0, this.scaleX * x + this.translateX);
        let toX = Math.min(width, this.scaleX * x + this.translateX + this.scaleX * w);
        let fromY = Math.max(0, this.scaleX * y + this.translateY);
        let toY = Math.min(height, this.scaleX * y + this.translateY + this.scaleX * h);

        for (let i = fromX; i < toX; i++) {
            for (let j = fromY; j < toY; j++) {
                this.array[i][j] = this.fillStyle;
            }
        }
    }
    this.toString = function () {
        let str = "";
        let lastRow = ''
        this.array.forEach((row, x) => {
            let rowStr = ''
            let rowCheck = ''
            let lastcolor = 0;
            row.forEach((val, y) => {
                if (val != lastcolor) {
                    rowStr += " [(" + x + "," + y + "): " + val + "]";
                    rowCheck += " (," + y + "): " + val;
                    lastcolor = val;
                }
            })
            if (rowCheck != lastRow) {
                str += rowStr + "\n";
                lastRow = rowCheck;
            }
        });
        return str;
    }

    this.array = new Array(width).fill(0).map(() => new Array(height).fill("#00000000"));
}

module.exports = {
    getContext: (w, h) => new CanvasContext(w, h),
}
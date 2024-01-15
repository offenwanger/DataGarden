import { DataUtil } from "./data_util.js";
import { DrawingUtil } from "./drawing_util.js";

export let ClassifierUtil = function () {
    let mCanvas = document.createElement('canvas');
    let mContext = mCanvas.getContext("2d");
    let mDrawingUtil = new DrawingUtil(mContext, mContext, mContext);

    function elementToImg(element, size = 16) {
        mDrawingUtil.reset({ x: 0, y: 0, k: 1 });
        mCanvas.height = size;
        mCanvas.width = size;

        let strokes = DataUtil.getStraightenedStrokes(element);
        mDrawingUtil.drawThumbnail({
            strokes: strokes,
            x: 0, y: 0,
            size
        });

        let newCanvas = document.createElement('canvas');
        let context = newCanvas.getContext('2d');
        newCanvas.width = size;
        newCanvas.height = size;
        for (let x = 0; x < size - 1; x++) {
            for (let y = 0; y < size - 1; y++) {
                let imgData = mContext.getImageData(x, y, 1, 1);
                let r = imgData.data[0];
                let g = imgData.data[1];
                let b = imgData.data[2];
                let a = imgData.data[3];
                if (r != g || r != b) {
                    // set all colors to the same grey.
                    r = 128;
                }
                imgData.data.set([r, r, r, a])
                context.putImageData(imgData, x, y);
            }
        }
        return newCanvas;
    }

    // we get the clustering for 1 - 8 clusters
    // then we get the square sum for the avg distance to center for all 8.
    function elementToImgVector(element, size = 16) {
        let strokes = DataUtil.getStraightenedStrokes(element);
        mDrawingUtil.reset({ x: 0, y: 0, k: 1 });
        mCanvas.height = size;
        mCanvas.width = size;
        mDrawingUtil.drawThumbnail({
            strokes: strokes,
            x: 0, y: 0,
            size
        });

        let imgData = mContext.getImageData(0, 0, size, size).data;
        let vector = [];
        for (let i = 0; i < imgData.length; i += 4) {
            let r = imgData[i];
            let g = imgData[i + 1];
            let b = imgData[i + 2];
            let a = imgData[i + 3];
            if (r != g || r != b) {
                // set all colors to the same grey.
                r = 128;
            }
            vector.push((1 - r / 255) * (a / 255));
        }
        return vector;
    }

    return {
        elementToImg,
        elementToImgVector,
    }
}();

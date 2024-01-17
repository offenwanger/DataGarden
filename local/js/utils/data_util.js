import { ChannelType, DimensionType } from "../constants.js";
import { Data } from "../data_structs.js";
import { IdUtil } from "./id_util.js";
import { PathUtil } from "./path_util.js";
import { ValUtil } from "./value_util.js";
import { VectorUtil } from "./vector_util.js";

export let DataUtil = function () {
    function numToColor(num) {
        return "#" + Math.round(num).toString(16).padStart(6, "0");
    }

    function rgbToHex(r, g, b) {
        return "#" +
            r.toString(16).padStart(2, "0") +
            g.toString(16).padStart(2, "0") +
            b.toString(16).padStart(2, "0");
    }

    function rgbaToHex(r, g, b, a) {
        return "#" +
            r.toString(16).padStart(2, "0") +
            g.toString(16).padStart(2, "0") +
            b.toString(16).padStart(2, "0") +
            a.toString(16).padStart(2, "0");
    }

    function hexToRGBA(hex) {
        if (hex.length != 7 && hex.length != 9) { console.error("invalid hex", hex); return { r: 0, g: 0, b: 0, a: 0 } };
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        let a = hex.length == 9 ? parseInt(hex.slice(7, 9), 16) : parseInt("FF", 16);

        return { r, g, b, a };
    }
    function imageDataToHex(imgData) {
        return "#" +
            imgData.data[0].toString(16).padStart(2, "0") +
            imgData.data[1].toString(16).padStart(2, "0") +
            imgData.data[2].toString(16).padStart(2, "0");
    }

    function getBoundingBox(objs) {
        // if it's not an array assume it's a single instance and carry forward.
        if (!Array.isArray(objs)) {
            objs = [objs];
        }

        let boundingBoxes;
        if (objs.every(o => o instanceof Data.Stroke)) {
            boundingBoxes = objs.map(stroke => {
                let bb = PathUtil.getBoundingBox(stroke.path);

                bb.x -= stroke.size / 2
                bb.y -= stroke.size / 2
                bb.height += stroke.size
                bb.width += stroke.size

                return bb;
            });
        } else if (objs.every(o => o instanceof Data.Element)) {
            boundingBoxes = objs.map(elem => {
                let bb = getBoundingBox(elem.strokes);
                return bb;
            });
        } else {
            console.error("Invalid array. Not a set of Elements or Strokes", objs);
            return { x: 0, y: 0, height: 1, width: 1 };
        }

        if (boundingBoxes.length == 0) {
            console.error("No valid elements to bound. ", objs);
            return null;
        }

        let x = Math.min(...boundingBoxes.map(b => b.x));
        let y = Math.min(...boundingBoxes.map(b => b.y));
        let xMax = Math.max(...boundingBoxes.map(b => b.x + b.width));
        let yMax = Math.max(...boundingBoxes.map(b => b.y + b.height));

        return { x, y, width: xMax - x, height: yMax - y, }
    }

    function overlap(bb1, bb2, tollerance = 0) {
        tollerance /= 2;
        bb1 = { x: bb1.x - tollerance, y: bb1.y - tollerance, height: bb1.height + tollerance, width: bb1.width + tollerance }
        bb2 = { x: bb2.x - tollerance, y: bb2.y - tollerance, height: bb2.height + tollerance, width: bb2.width + tollerance }
        let overlap1D = (min1, max1, min2, max2) => max1 >= min2 && max2 >= min1;
        return overlap1D(bb1.x, bb1.x + bb1.width, bb2.x, bb2.x + bb2.width) &&
            overlap1D(bb1.y, bb1.y + bb1.height, bb2.y, bb2.y + bb2.height);
    }

    function getDifferenceMetric(bb1, bb2) {
        let corners = [bb1, bb2].map(bb => {
            return [
                { x: bb.x, y: bb.y },
                { x: bb.x + bb.width, y: bb.y },
                { x: bb.x, y: bb.y + bb.height },
                { x: bb.x + bb.width, y: bb.y + bb.height },
            ]
        })
        let distMetric = 0
        for (let i = 0; i < 4; i++) {
            let d = VectorUtil.dist(corners[0][i], corners[1][i]);
            distMetric += d * d;
        }
        return distMetric;
    }

    function getElementSize(element) {
        console.error("impliment me!")
        return 1;
    }

    function getElementLevel(element, model) {
        if (!ValUtil.isType(element, Data.Element)) { console.error("invalid element", element); return -1; }

        let level = 0;
        let touched = [element.id];
        let curr = element;
        while (curr.parentId) {
            let parent = model.getElement(curr.parentId)
            if (!parent) { console.error("Invalid state, parent not found", curr.parentId); return -1; };
            level++;
            curr = parent;
            if (touched.includes(curr.id)) { console.error("Invalid State, loop", touched); return -1; }
            touched.push(curr.id);
        }
        return level;
    }

    function isDecendant(acestorId, decendantId, model) {
        let parentId = decendantId;
        while (parentId) {
            parentId = model.getElement(parentId).parentId;
            if (parentId == acestorId) {
                return true;
            }
        }
        return false;
    }

    function unique(arr) {
        if (arr.length == 0) return arr;
        if (arr[0].id) {
            return [...new Map(arr.map(item =>
                [item.id, item])).values()];
        } else {
            return [...new Map(arr.map(item =>
                [item, item])).values()];
        }
    }

    function findEmptyPlace(boundingBox, boundingBoxes) {
        function check(x, y) {
            if (boundingBoxes.some(b => overlap(b, {
                x: boundingBox.x + boundingBox.width * x,
                y: boundingBox.y + boundingBox.height * y,
                width: boundingBox.width,
                height: boundingBox.height,
            }))) {
                return null;
            } else {
                return {
                    x: boundingBox.x + boundingBox.width * x,
                    y: boundingBox.y + boundingBox.height * y
                }
            }
        }
        let location = check(0, 0);
        let round = 1;
        while (!location) {
            for (let n = 0; n <= round; n++) {
                location = location || check(n, round);
                location = location || check(n, -round);
                location = location || check(-n, round);
                location = location || check(-n, -round);
                if (n != round) {
                    location = location || check(round, n);
                    location = location || check(-round, n);
                    location = location || check(round, -n);
                    location = location || check(-round, -n);
                }
            }
            round++;
        }
        return location;
    }

    function getStrokesInLocalCoords(element) {
        let returnable = [];
        element.strokes.forEach(stroke => {
            stroke = stroke.clone();
            stroke.path = PathUtil.translate(stroke.path, element);
            returnable.push(stroke);
        });
        return returnable;
    }

    function channelIsDiscrete(channelType) {
        return channelType == ChannelType.FORM || channelType == ChannelType.COLOR;
    }

    function getTier(model, elementId) {
        let level = -1;
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Invalid element id", elementId); return 0; }
        do {
            level++;
            let element = model.getElement(elementId);
            if (!element) { console.error("Bad model state! Element id not found", elementId); return 0; }
            elementId = element.parentId;
        } while (elementId);
        return level;
    }

    function getMappedValue(model, dimensionId, elementId) {
        let dimension = model.getDimension(dimensionId);
        if (dimension.channel == ChannelType.FORM || dimension.channel == ChannelType.COLOR) {
            let level = dimension.levels.find(level => level.elementIds.includes(elementId));
            return level ? level.name : null;
        } else if (dimension.channel == ChannelType.POSITION) {
            let element = model.getElement(elementId);
            let percent = element.position;
            if (dimension.type == DimensionType.CONTINUOUS) {
                return (parseFloat(dimension.domain[1]) - parseFloat(dimension.domain[0])) * percent + parseFloat(dimension.domain[0]);
            } else {
                let level = getLevelForPercent(dimension, percent);
                return level ? level.name : null;
            }
        } else if (dimension.channel == ChannelType.ANGLE) {
            let element = model.getElement(elementId);
            let percent = DataUtil.angleToPercent(DataUtil.getRelativeAngle(element, element.parentId ? model.getElement(element.parentId) : null));
            if (dimension.type == DimensionType.CONTINUOUS) {
                return (parseFloat(dimension.domain[1]) - parseFloat(dimension.domain[0])) * percent + parseFloat(dimension.domain[0]);
            } else {
                let level = getLevelForPercent(dimension, percent);
                return level ? level.name : null;
            }
        } else if (dimension.channel == ChannelType.SIZE) {
            let elements = model.getElements().filter(e => DataUtil.getTier(model, e.id) == dimension.tier);
            let sizes = elements.map(e => PathUtil.getPathLength(e.spine));
            let min = Math.min(...sizes);
            let max = Math.max(...sizes)
            let eSize = PathUtil.getPathLength(elements.find(e => e.id == elementId).spine);
            let percent = (eSize - min) / (max - min);
            if (dimension.type == DimensionType.CONTINUOUS) {
                return (parseFloat(dimension.domain[1]) - parseFloat(dimension.domain[0])) * percent + parseFloat(dimension.domain[0]);
            } else {
                let level = getLevelForPercent(dimension, percent);
                return level ? level.name : null;
            }
        }
    }

    function getLevelForPercent(dimension, percent) {
        if (dimension.levels.length == 0) return null
        if (dimension.levels.length == 1) return dimension.levels[0];
        for (let i = 0; i < dimension.ranges.length; i++) {
            if (percent <= dimension.ranges[i]) return dimension.levels[i];
        }
        if (percent > dimension.ranges[dimension.ranges.length - 1]) {
            return dimension.levels[dimension.levels.length - 1];
        }

        console.error("No valid level found for percent", percent);
        return null;
    }

    function getPaddedPoints(nodes, padding) {
        let pointArr = [];
        nodes.forEach(d => {
            const pad = d.radius + padding;
            pointArr = pointArr.concat([
                [d.x - pad, d.y - pad],
                [d.x - pad, d.y + pad],
                [d.x + pad, d.y - pad],
                [d.x + pad, d.y + pad]
            ]);
        });
        return pointArr;
    }

    function domainIsValid(domain) {
        if (isNumeric(domain[0]) && isNumeric(domain[1])) return true;
        if (isDateLike(domain[0]) && isDateLike(domain[1])) return true;
    }

    function isNumeric(str) {
        if (typeof str == "number") return true;
        if (typeof str != "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    }

    function isDateLike(dateStr) {
        return !isNaN(new Date(dateStr));
    }

    function angleToPercent(angle) {
        return (angle + Math.PI) / (Math.PI * 2);
    }

    function getRelativeAngle(element, parent) {
        let tangent;
        if (parent) {
            tangent = PathUtil.getTangentForPercent(parent.spine, element.position);
        } else {
            tangent = { x: 0, y: -1 };
        }

        let angle = VectorUtil.toRotation(element.angle) - VectorUtil.toRotation(tangent);
        if (angle > Math.PI) angle = Math.PI * 2 - angle;
        return angle;

    }

    function getStraightenedStrokes(element) {
        let rotation = VectorUtil.toRotation(element.angle);
        let straight = VectorUtil.toRotation({ x: 0, y: -1 });
        return element.strokes.map(s => {
            s = s.clone();
            s.path = s.path.map(p => VectorUtil.rotateAroundPoint(p, element.root, rotation - straight));
            return s;
        })
    }

    function getStupidSpine(element) {
        if (element.strokes.length == 1) {
            return element.strokes[0].path;
        }

        let longAxis = getLongestAxis(element);
        let projectionData = [{ t: 0, offset: { x: 0, y: 0 } }, { t: 1, offset: { x: 0, y: 0 } }]
        element.strokes.forEach(stroke => stroke.path.forEach(point => {
            let projection = VectorUtil.projectToLine(point, longAxis[0], longAxis[1]);
            projectionData.push({ t: projection.t, offset: VectorUtil.subtract(point, projection) });
        }))
        let len = VectorUtil.dist(longAxis[1], longAxis[0]);
        let lineVector = VectorUtil.subtract(longAxis[1], longAxis[0]);
        let result = [longAxis[0]];
        let interval = len / 7
        for (let i = interval; i < len; i += interval) {
            let t1 = (i - interval / 2) / len;
            let t2 = (i + interval / 2) / len;
            let offsets = projectionData.filter(p => t1 <= p.t && p.t <= t2);
            if (offsets.length > 0) {
                let avgOffset = offsets.reduce((sum, { offset }) => {
                    sum.x += offset.x;
                    sum.y += offset.y;
                    return sum;
                }, { x: 0, y: 0 });
                avgOffset.x /= offsets.length;
                avgOffset.y /= offsets.length;
                let pointAtT = VectorUtil.add(VectorUtil.scale(lineVector, i / len), longAxis[0]);
                result.push(VectorUtil.add(pointAtT, avgOffset));
            }
        }
        result.push(longAxis[1]);
        return result;
    }

    function getLongestAxis(element) {
        let points = element.strokes.map(s => s.path).flat();
        let yMax = points.reduce((prev, current) => (prev.y > current.y) ? prev : current);
        let yMix = points.reduce((prev, current) => (prev.y < current.y) ? prev : current);
        let xMax = points.reduce((prev, current) => (prev.x > current.x) ? prev : current);
        let xMin = points.reduce((prev, current) => (prev.x < current.x) ? prev : current);
        points = [yMax, yMix, xMax, xMin];
        let pairs = points.flatMap((v, i) => points.slice(i + 1).map(w => [v, w]));
        let dists = pairs.map(pair => VectorUtil.dist(pair[0], pair[1]));
        return pairs[dists.findIndex(i => i == Math.max(...dists))];
    }

    function boundingBoxIntersects(bb1, bb2) {
        return !(bb2.x > bb1.x + bb1.width ||
            bb2.x + bb2.width < bb1.x ||
            bb2.y > bb1.y + bb1.height ||
            bb2.y + bb2.height < bb1.y);
    }

    function isDataId(id) {
        if (!id) return false;
        let result = false;
        Object.values(Data).forEach(dataClass => {
            result = result || IdUtil.isType(id, dataClass);
        });
        return result
    }

    function itemExists(id, model) {
        if (IdUtil.isType(id, Data.Stroke)) {
            return model.getStroke(id) ? true : false;
        } else if (IdUtil.isType(id, Data.Element)) {
            return model.getElement(id) ? true : false;
        } else if (IdUtil.isType(id, Data.Level)) {
            return model.getLevel(id) ? true : false;
        } else if (IdUtil.isType(id, Data.Dimension)) {
            return model.getDimension(id) ? true : false;
        } else {
            console.error("Id unsupported", id);
            return false;
        }
    }

    function dimensionTypeValid(dimension) {
        if (dimension.type == DimensionType.CONTINUOUS) {
            return dimension.channel == ChannelType.ANGLE || dimension.channel == ChannelType.POSITION || dimension.channel == ChannelType.SIZE;
        } else {
            // all types are valid for discrete dimens
            return true;
        }
    }

    function dimensionChannelValid(dimension) {
        // same for now.
        return dimensionTypeValid(dimension);
    }

    function dimensionTierValid(dimension) {
        if (dimension.channel == ChannelType.POSITION) {
            return dimension.tier > 0;
        } else {
            return true;
        }
    }

    function dimensionValid(dimension) {
        return dimensionTypeValid(dimension) &&
            dimensionChannelValid(dimension) &&
            dimensionTierValid(dimension);
    }

    function getTierColor(tier) {
        tier = parseInt(tier);
        return rgbToHex(255 - 20 * (tier + 1), 255 - 20 * (tier + 1), 255 - 20 * (tier + 1));
    }

    return {
        numToColor,
        rgbToHex,
        rgbaToHex,
        hexToRGBA,
        imageDataToHex,
        getBoundingBox,
        overlap,
        getDifferenceMetric,
        getElementSize,
        getElementLevel,
        isDecendant,
        unique,
        findEmptyPlace,
        getStrokesInLocalCoords,
        channelIsDiscrete,
        getTier,
        getMappedValue,
        getPaddedPoints,
        domainIsValid,
        isNumeric,
        isDateLike,
        angleToPercent,
        getRelativeAngle,
        getStraightenedStrokes,
        getStupidSpine,
        getLongestAxis,
        boundingBoxIntersects,
        isDataId,
        itemExists,
        dimensionTypeValid,
        dimensionChannelValid,
        dimensionTierValid,
        dimensionValid,
        getTierColor,
    }
}();

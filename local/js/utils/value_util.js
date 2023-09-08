let ValUtil = function () {
    function checkConvertionState(coords, boundingBox, zoomPan) {
        if (isNaN(parseInt(coords.x)) || isNaN(parseInt(coords.y))) {
            console.error('Bad conversion coords', coords);
            return false;
        }

        if (isNaN(parseInt(boundingBox.x)) || isNaN(parseInt(boundingBox.y))) {
            console.error('Bad canvas bounding box!', boundingBox);
            return false;
        }

        if (isNaN(parseInt(zoomPan.x)) || isNaN(parseInt(zoomPan.y))) {
            console.error('Bad transform state!', zoomPan);
            return false;
        }

        return true;
    }

    function isPath(path) {
        return Array.isArray(path) && path.every(p => isCoord(p));
    }

    function isCoord(v) {
        return v && isNum(v.x) && isNum(v.y);

    }

    function isNum(num) {
        return typeof num == 'number' && !isNaN(num);
    }

    function isType(obj, type) {
        return obj instanceof type;
    }

    function isGroupValid(element, model) {
        if (!ValUtil.isType(element, Data.Element)) { console.error("invalid element", element); return; }
        let group = model.getGroupForElement(element.id);
        if (!group) {
            return false;
        } else {
            if (DataUtil.getGroupLevel(group, model) != DataUtil.getElementLevel(element, model)) {
                return false
            } else if (element.parentId) {
                let parentGroup = model.getGroupForElement(element.parentId)
                if (!parentGroup) { console.error("Invalid state, can't get group for parent", element.parentId); return false; }
                return group.parentId == parentGroup.id;
            } else {
                return true;
            }
        }
    }

    function outOfBounds(point, box) {
        if (point.x <= box.x ||
            point.x >= box.x + box.width ||
            point.y <= box.y ||
            point.y >= box.y + box.height) {
            return true;
        } else {
            return false;
        }
    }

    return {
        isCoord,
        isNum,
        isPath,
        isType,
        isGroupValid,
        checkConvertionState,
        outOfBounds,
    }
}();
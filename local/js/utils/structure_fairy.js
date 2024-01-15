import { DataUtil } from "./data_util.js";
import { PathUtil } from "./path_util.js";
import { VectorUtil } from "./vector_util.js";

export let StructureFairy = function () {
    function getMerge(stroke, model) {
        let bb = DataUtil.getBoundingBox([stroke]);
        bb.x -= bb.width / 4
        bb.y -= bb.height / 4
        bb.width *= 1.5
        bb.height *= 1.5;

        let elements = model.getElements();
        let nearElements = elements.filter(e => DataUtil.boundingBoxIntersects(bb, DataUtil.getBoundingBox(e)));

        let overlappingElements = nearElements.filter(e => {
            return e.strokes.some(s => {
                return PathUtil.pathOverlaps(stroke.path, s.path)
            })
        })

        return overlappingElements;
    }

    function getParent(stroke, model) {
        let bb = DataUtil.getBoundingBox([stroke]);
        bb.x -= bb.width / 4
        bb.y -= bb.height / 4
        bb.width *= 1.5
        bb.height *= 1.5;

        let elements = model.getElements();
        let nearElements = elements.filter(e => DataUtil.boundingBoxIntersects(bb, DataUtil.getBoundingBox(e)));
        if (nearElements.length == 0) return null;

        let elementDists = nearElements.map(element => {
            let strokeDists = element.strokes.map(s => {
                return stroke.path.reduce((closestDist, p) => {
                    let closestPoint = PathUtil.getClosestPointOnPath(p, s.path);
                    return Math.min(closestDist, VectorUtil.dist(closestPoint, p));
                }, Infinity)
            })
            return { element, dist: Math.min(...strokeDists) };
        })

        let size;
        if (PathUtil.isLineLike(stroke.path)) {
            size = PathUtil.getPathLength(stroke.path) / 4
        } else {
            size = Math.max(bb.width, bb.height) * 2;
        }

        let minDist = Math.min(...elementDists.map(ed => ed.dist));
        if (minDist < size) {
            return elementDists.find(ed => ed.dist == minDist).element.id;
        } else {
            return null;
        }

    }

    return {
        getMerge,
        getParent,
    }
}();

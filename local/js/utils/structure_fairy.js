import { ChannelType, DimensionType } from "../constants.js";
import { Data } from "../data_structs.js";
import { ClassifierUtil } from "./classifier_util.js";
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

    // adds all relevant elements to the levels. Creates the levels if they do not exist.
    function getCluster(dimenId, model) {
        let dimension = model.getDimension(dimenId);
        if (!dimension) {
            console.error("invalid dimension id.", dimenId);
            return;
        }

        if (dimension.type != DimensionType.DISCRETE ||
            (dimension.channel != ChannelType.FORM && dimension.channel != ChannelType.COLOR)) {
            // not discrete, doesn't use levels.
            return;
        }

        let elements = model.getElements()
            .filter(e => dimension.tier == DataUtil.getTier(model, e.id));
        if (elements.length == 0) return;
        let levels = dimension.levels;


        let clusters = [];
        if (dimension.channel == ChannelType.FORM) {
            clusters = ClassifierUtil.clusterElementForms(elements, levels);
        } else if (dimension.channel == ChannelType.COLOR) {
            clusters = ClassifierUtil.clusterElementColors(elements, levels);
        } else { console.error("Not dealing with a discrete channel.", dimension.channel); return; }
        let clusterCount = Math.max(...clusters) + 1;

        let updatedLevels = []
        for (let i = 0; i < clusterCount; i++) {
            let level;
            if (i < levels.length) {
                level = levels[i]
            } else {
                level = new Data.Level();
                level.name = "Category" + (i + 1);
            }
            let clusterElementIds = clusters
                .map((cluster, elementIndex) => cluster == i ? elementIndex : -1)
                .filter(i => i != -1)
                .map(i => elements[i].id);
            level.elementIds = DataUtil.unique(level.elementIds.concat(clusterElementIds));
            updatedLevels.push(level);
        }

        return updatedLevels;
    }

    return {
        getMerge,
        getParent,
        getCluster,
    }
}();

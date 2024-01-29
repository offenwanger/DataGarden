import { ChannelType, DimensionType, MAP_ELEMENTS, NO_LEVEL_ID } from "../constants.js";
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
        let elements = model.getElements()
            .filter(e => dimension.tier == DataUtil.getTier(model, e.id));
        if (elements.length == 0) return;

        if (dimension.type == DimensionType.DISCRETE) {
            let levels = dimension.levels;
            if (dimension.unmappedIds.length > 0) {
                levels.push({ id: NO_LEVEL_ID, elementIds: dimension.unmappedIds });
            }

            let clusters = [];
            if (dimension.channel == ChannelType.COLOR) {
                clusters = ClassifierUtil.clusterElementColors(elements, levels);
            } else {
                clusters = ClassifierUtil.clusterElementForms(elements, levels);
            }
            let clusterCount = Math.max(...clusters) + 1;

            for (let i = 0; i < clusterCount; i++) {
                let level = levels[i];
                if (!level) {
                    if (i == 0 || dimension.channel == ChannelType.COLOR || dimension.channel == ChannelType.FORM) {
                        level = new Data.Level();
                        level.name = "Category" + (i + 1);
                        levels.push(level)
                    } else {
                        // don't make new categories unless we are using a discrete channel.
                        level = levels[0];
                    }
                }
                let clusterElementIds = clusters
                    .map((cluster, elementIndex) => cluster == i ? elementIndex : -1)
                    .filter(i => i != -1)
                    .map(i => elements[i].id);
                level.elementIds = DataUtil.unique(level.elementIds.concat(clusterElementIds));
            }
            for (let i = clusterCount; i < levels.length; i++) {
                levels[i].elementIds = [];
            }

            if (dimension.unmappedIds.length == 0) {
                // we always return this level, but we don't map there unless the user already is using it
                levels.push({ id: NO_LEVEL_ID, elementIds: [] });
            }

            return levels;
        } else {
            let levels = [
                { id: NO_LEVEL_ID, elementIds: dimension.unmappedIds },
                { id: MAP_ELEMENTS, elementIds: elements.map(e => e.id).filter(eId => !dimension.unmappedIds.includes(eId)) },
            ];

            let clusters = ClassifierUtil.clusterElementForms(elements, levels);
            let unmappedIds = clusters.map((c, index) => c == 0 ? elements[index].id : null).filter(id => id);

            return dimension.levels.concat([{ id: NO_LEVEL_ID, elementIds: unmappedIds }]);
        }
    }

    return {
        getMerge,
        getParent,
        getCluster,
    }
}();

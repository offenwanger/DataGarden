import { ChannelType, DimensionType, NO_CATEGORY_ID } from "../constants.js";
import { DataModel } from "../data_model.js";
import { Data } from "../data_structs.js";
import { DataUtil } from "./data_util.js";
import { IdUtil } from "./id_util.js";
import { PathUtil } from "./path_util.js";
import { StructureFairy } from "./structure_fairy.js";
import { VectorUtil } from "./vector_util.js";

export let ModelUtil = function () {
    function updateParent(parentElementId, elementId, modelController) {
        if (parentElementId == elementId) { console.error("Can't parent a node to itself! " + parentElementId); return; }
        let model = modelController.getModel();
        let element = model.getElement(elementId);
        if (!element) { console.error("invalid element id"); return; }

        let parentElement;
        if (parentElementId) { parentElement = model.getElement(parentElementId); }
        if (parentElementId && !parentElement) { console.error("invalid element id"); return; }

        if (DataUtil.isDecendant(elementId, parentElementId, model)) {
            updateParent(element.parentId, parentElementId, modelController);
            model = modelController.getModel();
        }

        element.parentId = parentElementId;
        modelController.updateElement(element);
    }

    function clearEmptyElements(modelController) {
        modelController.getModel().getElements()
            .filter(e => e.strokes.length == 0)
            .map(e => e.id)
            .forEach(eId => removeElement(eId, modelController));
    }

    function removeElement(elementId, modelController) {
        if (!IdUtil.isType(elementId, Data.Element)) { console.error("Invalid element id", elementId); return; }
        let model = modelController.getModel();
        let element = model.getElement(elementId);
        if (!element) return; // already gone. No need to error, it should be fine. 
        model.getElementChildren(elementId).forEach(child => {
            child.parentId = element.parentId;
            modelController.updateElement(child);
        })
        model.getCategories().forEach(category => {
            if (category.elementIds.includes(elementId)) {
                category.elementIds = category.elementIds.filter(id => id != elementId);
                modelController.updateCategory(category);
            }
        })
        modelController.removeElement(elementId);
    }

    function autoClusterLevelDimensions(level, modelController) {
        let model = modelController.getModel();
        model.getDimensions().filter(d => d.level == level).forEach(dimen => {
            let categories = StructureFairy.getCluster(dimen.id, model);
            if (categories) {
                let noMapping = categories.find(l => l.id == NO_CATEGORY_ID).elementIds;
                dimen.unmappedIds = noMapping;
                dimen.categories = categories.filter(l => l.id != NO_CATEGORY_ID);
                ModelUtil.syncRanges(dimen);
                modelController.updateDimension(dimen);
            }
        });
    }

    function orientSpine(spine, root) {
        if (VectorUtil.dist(root, spine[0]) > VectorUtil.dist(root, spine[spine.length - 1])) {
            return spine.reverse();
        } else return spine;
    }

    function orientSpineToParent(spine, parentSpine) {
        let pos0 = PathUtil.getClosestPointOnPath(spine[0], parentSpine);
        let pos1 = PathUtil.getClosestPointOnPath(spine[spine.length - 1], parentSpine);
        if (VectorUtil.dist(pos1, spine[spine.length - 1]) < VectorUtil.dist(pos0, spine[0])) {
            return spine.reverse();
        } else return spine;
    }

    function orientElementByParent(element, parentSpine) {
        element.spine = ModelUtil.orientSpineToParent(element.spine, parentSpine);
        element.root = element.spine[0];
        element.angle = VectorUtil.normalize(VectorUtil.subtract(PathUtil.getPositionForPercent(element.spine, 0.2), element.spine[0]))
    }

    function syncRanges(dimension) {
        while (dimension.ranges.length < dimension.categories.length - 1) {
            let lastRange = dimension.ranges.length ? dimension.ranges[dimension.ranges.length - 1] : 0;
            dimension.ranges.push((1 - lastRange) / 2 + lastRange)
        }

        if (dimension.ranges.length > dimension.categories.length - 1) {
            dimension.ranges = dimension.ranges.slice(0, dimension.categories.length - 1);
        }
    }

    function updateCategories(dimension, model) {
        if (dimension.channel == ChannelType.LABEL) {
            let elements = model.getElements().filter(e => DataUtil.getLevelForElement(e.id, model) == dimension.level);
            elements.forEach(e => {
                if (dimension.unmappedIds.includes(e.id)) return;
                let category = dimension.categories.find(c => c.elementIds.includes(e.id));
                if (!category) category = dimension.categories.find(c => c.elementIds.length == 0);
                if (!category) { category = new Data.Category(); dimension.categories.push(category); }
                category.elementIds = [e.id];
            });
            dimension.categories.forEach((category, index) => {
                if (!category.name || DataUtil.isDefaultLabel(dimension.name, category.name)) {
                    category.name = dimension.name + index;
                }
            });
            dimension.categories.filter(c => c.elementIds > 0 || !DataUtil.isDefaultLabel(dimension.name, c.name));
        } else if (dimension.channel == ChannelType.SHAPE || dimension.channel == ChannelType.COLOR) {
            let categories = StructureFairy.getCluster(dimension.id, model);
            if (categories) {
                let noMapping = categories.find(l => l.id == NO_CATEGORY_ID).elementIds;
                dimension.unmappedIds = noMapping;
                dimension.categories = categories.filter(l => l.id != NO_CATEGORY_ID);
            }
        }
    }

    function modelFromTables(template, dataTables) {
        let newModel = new DataModel();
        newModel.setDimensions(template.getDimensions().map(dimen => dimen.clone()));
        newModel.getDimensions().forEach(dimen => {
            dimen.categories.forEach(category => {
                category.elementIds = [];
            });
        })
        // may need to clear out elements here

        let originalTables = template.getTables();

        dataTables.forEach((table, tableIndex) => {
            let columns = originalTables[tableIndex].getColumns();
            let originalDataArray = originalTables[tableIndex].getDataArray();

            let maxLevel = Math.max(...columns.map(c => c.level));
            for (const row of table) {
                let parentId = null;
                for (let level = 0; level <= maxLevel; level++) {
                    let levelElementIds = DataUtil.unique(originalDataArray.map(row => row[columns.findIndex(c => c.level == level)].id));
                    // show we make a new element or find an existing one?
                    let element = null; // TODO: find an existing element
                    if (!element) {
                        element = new Data.Element();
                        element.parentId = parentId;

                        let dimensions = columns.map(c => template.getDimension(c.id)).filter(d => d.level == level);
                        let shapeDimens = dimensions.filter(d => d.channel == ChannelType.SHAPE);
                        let sampleShapeElementsIds = [];
                        if (shapeDimens.length == 0) {
                            sampleShapeElementsIds = levelElementIds;
                        } else {
                            if (shapeDimens > 1) {
                                console.log("Need to validate double shape");
                            }
                            let shapeDimen = shapeDimens[0];
                            let shapeValue = row[columns.findIndex(c => c.id == shapeDimen.id)];
                            let category = shapeDimen.categories.find(c => c.name == shapeValue);
                            sampleShapeElementsIds = category.elementIds;
                        }

                        let sampledShapeElement = template.getElement(sampleShapeElementsIds[0]).clone();// TODO: Actually sample
                        //TODO: Parent shift and conversion
                        element.strokes = sampledShapeElement.strokes;
                        element.spine = sampledShapeElement.spine;

                        let colorDimens = dimensions.filter(d => d.channel == ChannelType.COLOR);
                        if (colorDimens.length > 0) {
                            if (colorDimens > 1) {
                                console.log("Need to validate double color");
                            }
                            let colorDimen = colorDimens[0];
                            let colorValue = row[columns.findIndex(c => c.id == colorDimen.id)];
                            let category = colorDimen.categories.find(c => c.name == colorValue);
                            let sampleColorElementsIds = category.elementIds;
                            if (!sampleColorElementsIds.includes(sampledShapeElement.id)) {
                                let shapeCrossColor = sampleColorElementsIds.filter(id => sampleShapeElementsIds.includes(id));
                                if (shapeCrossColor.length > 0) {
                                    sampleColorElementsIds = shapeCrossColor;
                                }
                                let sampleColorElement = template.getElement(sampleColorElementsIds[0]) //TODO: Actually sample

                                let currentColors = DataUtil.unique(element.strokes.map(s => s.color)).sort();
                                let sampledColors = DataUtil.unique(sampleColorElement.strokes.map(s => s.color)).sort();
                                for (let i = sampledColors.length; i < currentColors.length; i++) {
                                    sampledColors[i] = sampledColors[i - 1];
                                }
                                element.strokes.forEach(stroke => {
                                    let colorIndex = currentColors.findIndex(c => c == stroke.color)
                                    stroke.color = sampledColors[colorIndex];
                                })
                            }
                        }

                        let sizeDimens = dimensions.filter(d => d.channel == ChannelType.SIZE);
                        if (sizeDimens.length > 0) {
                            if (sizeDimens > 1) {
                                console.log("Need to validate double size");
                            }
                            let sizeDimen = sizeDimens[0];
                            let sizeValue = row[columns.findIndex(c => c.id == sizeDimen.id)];
                            if (sizeDimen.type == DimensionType.DISCRETE) {
                                // find the category this size falls into
                                // same as above
                            } else if (sizeDimen.type == DimensionType.CONTINUOUS) {
                                sizeValue = parseFloat(sizeValue);
                                // calculate the channel value
                                // get the currnelt channel value
                                // scale the element
                                console.log("Finish me!");
                            }
                        }

                        let positionDimens = dimensions.filter(d => d.channel == ChannelType.POSITION);
                        if (positionDimens.length > 0) {
                            if (positionDimens > 1) {
                                console.log("Need to validate double position");
                            }
                            let positionDimen = positionDimens[0];
                            let positionValue = row[columns.findIndex(c => c.id == positionDimen.id)];
                            let position = 0;
                            if (positionDimen.type == DimensionType.DISCRETE) {
                                let elementIds = DataUtil.unmapValue(template, positionDimen.id, positionValue)
                                let positions = elementIds.map(eId => DataUtil.getChannelPercentForElement(template.getElement(eId), positionDimen, template));
                                console.log("actually sample???")
                                position = positions[0];
                            } else if (positionDimen.type == DimensionType.CONTINUOUS) {
                                positionValue = parseFloat(positionValue);
                                if (isNaN(positionValue)) { console.error('invalid position value'); } else {
                                    position = DataUtil.unmapValue(template, positionDimen.id, positionValue)
                                }
                            }
                            let sampledParent = template.getElement(sampledShapeElement.parentId);
                            let sampledParentPosition = PathUtil.getClosestPointOnPath(sampledShapeElement.root, sampledParent.spine);
                            let offset = VectorUtil.subtract(sampledShapeElement.root, sampledParentPosition);
                            let parent = newModel.getElement(element.parentId);
                            let parentPosition = PathUtil.getPositionForPercent(parent.spine, position);
                            element.root = VectorUtil.add(offset, parentPosition);
                        } else {
                            if (level == 0) {
                                // absolute positioning
                                let positions = levelElementIds.map(id => template.getElement(id).root);
                                if (positions.length == 1) {
                                    element.root = positions[0];
                                } else {
                                    let xDist = Math.max(...positions.map(p => p.x)) - Math.min(...positions.map(p => p.x));
                                    let yDist = Math.max(...positions.map(p => p.y)) - Math.min(...positions.map(p => p.y));
                                    if (xDist > yDist) {
                                        let avgY = positions.map(p => p.y).reduce((sum, curY) => sum + curY, 0) / positions.length
                                        let xs = positions.map(p => p.x).sort();
                                        let avgXDist = xs.reduce((sum, curX, index) => sum + (index == 0 ? 0 : curX - xs[index - 1]), 0) / positions.length;
                                        element.root = { x: Math.max(...positions.map(p => p.x)) + avgXDist, y: avgY };
                                    } else {
                                        let avgX = positions.map(p => p.x).reduce((sum, curX) => sum + curX, 0) / positions.length
                                        let ys = positions.map(p => p.y).sort();
                                        let avgYDist = ys.reduce((sum, curY, index) => sum + (index == 0 ? 0 : curY - ys[index - 1]), 0) / positions.length;
                                        element.root = { y: Math.max(...positions.map(p => p.y)) + avgYDist, x: avgX };
                                    }
                                }
                            } else {
                                let sampledParent = template.getElement(sampledShapeElement.parentId);
                                let sampledParentPosition = PathUtil.getClosestPointOnPath(sampledShapeElement.root, sampledParent.spine);
                                let offset = VectorUtil.subtract(sampledShapeElement.root, sampledParentPosition);
                                let parent = newModel.getElement(element.parentId);
                                let parentPosition = PathUtil.getPositionForPercent(parent.spine, sampledParentPosition.percent);
                                element.root = VectorUtil.add(offset, parentPosition);
                            }
                        }
                        let positionTranslation = VectorUtil.subtract(element.root, sampledShapeElement.root);
                        element.strokes.forEach(stroke => stroke.path = PathUtil.translate(stroke.path, positionTranslation));
                        element.spine = PathUtil.translate(element.spine, positionTranslation)

                        element.angle = sampledShapeElement.angle;
                        let angleDimens = dimensions.filter(d => d.channel == ChannelType.ANGLE);
                        if (angleDimens.length > 0) {
                            // if angle is mapped do something else keep what we had from above
                            if (angleDimens > 1) {
                                console.log("Need to validate double angle");
                            }
                            let angleDimen = angleDimens[0];
                            let angleValue = row[columns.findIndex(c => c.id == angleDimen.id)];
                            if (angleDimen.type == DimensionType.DISCRETE) {
                                // find the category this angle falls into
                                // same as above
                                console.log("Finish me!");
                            } else if (angleDimen.type == DimensionType.CONTINUOUS) {
                                angleValue = parseFloat(angleValue);
                                // calculate the channel value
                                // get the currnelt channel value
                                // scale the element
                                console.log("Finish me!");
                            }
                        }
                    }
                    newModel.getElements().push(element);

                    parentId = element.id;
                }
            }
        })
        return newModel;
    }

    return {
        updateParent,
        clearEmptyElements,
        removeElement,
        autoClusterLevelDimensions,
        orientSpine,
        orientSpineToParent,
        orientElementByParent,
        syncRanges,
        updateCategories,
        modelFromTables,
    }
}();
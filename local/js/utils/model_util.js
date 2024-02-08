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
            dimen.unmappedIds = [];
        })

        let originalTables = template.getTables();
        let originalDimensions = template.getDimensions();

        dataTables.forEach((table, tableIndex) => {
            if (table.length == 0) { return; }

            // columns is the same for the template and the new model
            let columns = originalTables[tableIndex].getColumns();
            let originalDataArray = originalTables[tableIndex].getDataArray();
            let orignalTableDimenions = originalDimensions.filter(d => originalTables[tableIndex].getColumns().find(c => d.id == c.id));
            let newUnmappedDimensions = newModel.getDimensions().filter(d => !originalTables[tableIndex].getColumns().find(c => d.id == c.id));
            let newDataArray = table.map((row, rowIndex) => row.map((cell, colIndex) => {
                return { dimensionId: columns[colIndex].id, value: cell, level: columns[colIndex].level, row: rowIndex }
            }));
            let maxLevel = Math.max(...columns.map(c => c.level));
            // this structure is for finding elements at levels that might be totally unmapped.
            let originalLevelElements = [];
            // the leafs must be unique, so we can just get those element ids
            let currentElements = originalDataArray.map(row => row[row.length - 1].id).map(eId => template.getElement(eId));
            for (let level = maxLevel; level >= 0; level--) {
                originalLevelElements.unshift(currentElements.map(n => n.id));
                if (level > 0) currentElements = DataUtil.unique(currentElements.map(e => template.getElement(e.parentId)))
            }

            // this structure is a 2D array of levels X rows that has a pointer to the element for each
            // row and level, i.e. it's a 2D array tree structure.
            let newElements = new Array(maxLevel + 1).fill(0).map(_ => new Array(table.length).fill(false));
            for (let level = 0; level <= maxLevel; level++) {
                let originalLevelLabelDimen = orignalTableDimenions.find(d => d.level == level && d.channel == ChannelType.LABEL);
                let newLevelLabelDimen = originalLevelLabelDimen ? newModel.getDimensions().find(d => d.id == originalLevelLabelDimen.id) : null;
                let labelDimenIndex = originalLevelLabelDimen ? columns.findIndex(c => c.id == originalLevelLabelDimen.id) : -1;
                if (labelDimenIndex >= 0) {
                    let levelLabels = table.map(r => r[labelDimenIndex])
                    let levelElements = {}
                    DataUtil.unique(levelLabels).forEach(label => {
                        let newCategory = newLevelLabelDimen.categories.find(c => c.name == label);
                        if (!newCategory) {
                            newCategory = new Data.Category();
                            newCategory.name = label;
                            newLevelLabelDimen.categories.push(newCategory);
                        }
                        if (newCategory.elementIds.length > 0) {
                            levelElements[label] = newModel.getElement(newCategory.elementIds[0]);
                        } else {
                            levelElements[label] = new Data.Element();
                            newCategory.elementIds.push(levelElements[label].id);
                        }
                    })
                    levelLabels.forEach((label, rowIndex) => {
                        newElements[level][rowIndex] = levelElements[label];
                    });
                } else {
                    // no level label, we either set all to one element or all to different elements.
                    if (originalLevelElements[level].length == table.length) {
                        table.forEach((r, rowIndex) => newElements[level][rowIndex] = new Data.Element());
                    } else if (originalLevelElements[level].length == 1) {
                        let element = new Data.Element();
                        table.forEach((r, rowIndex) => newElements[level][rowIndex] = element);
                    } else {
                        console.log("this should have been handled by adding a label.", level, originalLevelElements[level]);
                        table.forEach((r, rowIndex) => newElements[level][rowIndex] = new Data.Element());
                    }
                }
            }

            // first set the parents and push them into the model.
            newElements.forEach((elements, level) => {
                elements = DataUtil.unique(elements);
                elements.forEach((element, row) => {
                    if (level > 0) element.parentId = newElements[level - 1][row].id;
                    newModel.getElements().push(element);
                    newUnmappedDimensions.filter(d => d.level == level).forEach(d => d.unmappedIds.push(element.id));
                });
            })

            newElements.forEach((_, level) => {
                let levelDimensions = columns.filter(c => c.level == level).map(c => template.getDimension(c.id));
                deriveShape(template, newModel, levelDimensions, newDataArray, newElements[level], originalLevelElements[level]);
            })

            newElements.forEach((_, level) => {
                let levelDimensions = columns.filter(c => c.level == level).map(c => template.getDimension(c.id));
                deriveColor(template, newModel, levelDimensions, newDataArray, newElements[level], originalLevelElements[level]);
            })

            return newModel;

            for (const row of table) {
                let parentId = null;
                let levelElementIds = DataUtil.unique(originalDataArray.map(row => row[columns.findIndex(c => c.level == level)].id));
                // show we make a new element or find an existing one?
                let element = null; // TODO: find an existing element
                if (!element) {
                    element = new Data.Element();
                    element.parentId = parentId;

                    let dimensions = columns.map(c => template.getDimension(c.id)).filter(d => d.level == level);
                    let shapeDimens = dimensions.filter(d => d.channel == ChannelType.SHAPE);



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

        })
        return newModel;
    }

    function deriveShape(template, model, levelDimensions, newDataArray, newElements, templateElementIds) {
        let shapeDimens = levelDimensions.filter(d => d.channel == ChannelType.SHAPE);
        let templateElements = templateElementIds.map(eId => template.getElement(eId));
        let elements = []
        let sampleElements = []
        if (shapeDimens.length == 0) {
            sampleElements = templateElements;
            elements = DataUtil.unique(newElements);
            for (let i = sampleElements.length; i < newElements.length; i++) {
                sampleElements.push(sampleElements[i - sampleElements.length]);
            }
        } else {
            let shapeDimen = shapeDimens[0];
            let shapeValues = DataUtil.unique(newDataArray.flat().filter(v => v.dimensionId == shapeDimen.id).map(v => v.value));
            shapeValues.forEach(value => {
                let mappedElementIds = DataUtil.unmapValue(template, shapeDimen.id, value);
                let samples = mappedElementIds.map(eId => template.getElement(eId));
                let valueElements = DataUtil.unique(newDataArray.flat().filter(v => v.dimensionId == shapeDimen.id && v.value == value).map(v => newElements[v.row]));
                for (let i = 0; i < valueElements.length; i++) {
                    samples.push(samples[i - samples.length]);
                }
                samples = samples.slice(0, valueElements.length);
                sampleElements.push(...samples)
                elements.push(...valueElements)
            })
        }

        elements.forEach((element, index) => {
            let sampleElement = sampleElements[index].clone();
            element.strokes = sampleElement.strokes;
            element.spine = sampleElement.spine;
            element.root = sampleElement.root;
            element.angle = sampleElement.angle;
            if (element.parentId) {
                let sampleParent = template.getElement(sampleElement.parentId);
                let elementParent = model.getElement(element.parentId);
                if (PathUtil.isLineLike(sampleParent.spine)) {
                    let sampleParentPosition = PathUtil.getClosestPointOnPath(sampleElement.root, sampleParent.spine);
                    let sampleNormal = PathUtil.getNormalForPercent(sampleParent.spine, sampleParentPosition.percent);
                    let sampleOffset = VectorUtil.subtract(sampleElement.root, sampleParentPosition);
                    let dist = VectorUtil.dist(sampleElement.root, sampleParentPosition) * (VectorUtil.dot(sampleNormal, sampleOffset) > 0 ? 1 : -1);
                    let elementParentPosition = PathUtil.getPositionForPercent(elementParent.spine, sampleParentPosition.percent);
                    let elementNormal = PathUtil.getNormalForPercent(elementParent.spine, sampleParentPosition.percent);
                    element.root = VectorUtil.add(VectorUtil.scale(elementNormal, dist), elementParentPosition);
                    let translationOffset = VectorUtil.subtract(element.root, sampleElement.root);
                    let angleOffset = VectorUtil.rotation(sampleNormal, elementNormal);
                    element.angle = VectorUtil.rotate(element.angle, angleOffset);
                    element.strokes.forEach(stroke => stroke.path = PathUtil.translate(stroke.path, translationOffset));
                    element.strokes.forEach(stroke => stroke.path = stroke.path.map(p => VectorUtil.rotateAroundPoint(p, element.root, angleOffset)));
                } else {
                    let angleOffset = VectorUtil.rotation(sampleParent.angle, elementParent.angle);
                    let sampleOffset = VectorUtil.subtract(sampleElement.root, sampleParent.root);
                    let elementOffset = VectorUtil.rotate(sampleOffset, angleOffset);
                    element.root = VectorUtil.add(elementOffset, elementParent.root);
                    element.angle = VectorUtil.rotate(element.angle, angleOffset);
                    element.strokes.forEach(stroke => stroke.path = PathUtil.translate(stroke.path, translationOffset));
                    element.strokes.forEach(stroke => stroke.path = stroke.path.map(p => VectorUtil.rotateAroundPoint(p, element.root, angleOffset)));
                }
            }
        })
    }

    function deriveColor(template, model, levelDimensions, newDataArray, newElements, templateElementIds) {
        let colorDimens = levelDimensions.filter(d => d.channel == ChannelType.COLOR);
        if (colorDimens.length == 0) return;
        let colorDimen = colorDimens[0];

        let colorValues = DataUtil.unique(newDataArray.flat().filter(v => v.dimensionId == colorDimen.id).map(v => v.value));
        colorValues.forEach(value => {
            let mappedElementIds = DataUtil.unmapValue(template, colorDimen.id, value);
            let sampleColorSets = mappedElementIds.map(eId => template.getElement(eId).strokes.map(s => s.color)).sort();
            let valueElements = DataUtil.unique(newDataArray.flat().filter(v => v.dimensionId == colorDimen.id && v.value == value).map(v => newElements[v.row]));
            valueElements.forEach(element => {
                let elementColors = element.strokes.map(s => s.color).sort();
                let setDists = sampleColorSets.map(set => elementColors.reduce((sum, c) => sum + Math.min(...set.map(setC => DataUtil.colorDist(setC, c))), 0))
                let minDist = Math.min(...setDists);
                if (minDist == 0) {
                    // colors all good
                    return;
                }
                let closestSet = sampleColorSets[setDists.indexOf(minDist)];
                element.strokes.forEach(stroke => {
                    stroke.color = DataUtil.closestColor(stroke.color, closestSet);
                })
            })

            model.getDimensions().find(d => d.id == colorDimen.id).categories
                .find(c => c.name == value).elementIds.push(...valueElements.map(e => e.id))
        })

        return;
        if (colorDimens.length > 0) {
            if (colorDimens > 1) {
                console.log("Need to validate double color");
            }
            let colorDimen = colorDimens[0];
            newElements.forEach((element, row) => {
                let rowData = newDataArray[row];
                let colorValue = row[columns.findIndex(c => c.id == colorDimen.id)];
                let category = colorDimen.categories.find(c => c.name == colorValue);
                let sampleColorElementsIds = category.elementIds;
                let sampleColorElements = sampleColorElementsIds.map(id => template.getElement(id));
                let currentColors = DataUtil.unique(element.strokes.map(s => s.color)).sort();
                let sampledColors = DataUtil.unique(sampleColorElement.strokes.map(s => s.color)).sort();
                for (let i = sampledColors.length; i < currentColors.length; i++) {
                    sampledColors[i] = sampledColors[i - 1];
                }
                element.strokes.forEach(stroke => {
                    let colorIndex = currentColors.findIndex(c => c == stroke.color)
                    stroke.color = sampledColors[colorIndex];
                })

            })
        }
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
import { AngleType, ChannelType, DimensionType, NO_CATEGORY_ID, SizeType } from "../constants.js";
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
                    if (!newModel.getElement(element.id)) newModel.getElements().push(element);
                    newUnmappedDimensions.filter(d => d.level == level).forEach(d => {
                        if (!d.unmappedIds.includes(element.id)) d.unmappedIds.push(element.id)
                    });
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

            newElements.forEach((_, level) => {
                let levelDimensions = columns.filter(c => c.level == level).map(c => template.getDimension(c.id));
                console.log("Need to shuffle children here")
                deriveSize(template, newModel, levelDimensions, newDataArray, newElements[level], originalLevelElements[level]);
            })

            newElements.forEach((_, level) => {
                let levelDimensions = columns.filter(c => c.level == level).map(c => template.getDimension(c.id));
                derivePosition(template, newModel, levelDimensions, newDataArray, newElements[level], originalLevelElements[level]);
            })

            newElements.forEach((_, level) => {
                let levelDimensions = columns.filter(c => c.level == level).map(c => template.getDimension(c.id));
                deriveAngle(template, newModel, levelDimensions, newDataArray, newElements[level], originalLevelElements[level]);
            })
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

                model.getDimensions().find(d => d.id == shapeDimen.id).categories
                    .find(c => c.name == value).elementIds.push(...valueElements.map(e => e.id))
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
                element.spine = PathUtil.translate(element.spine, translationOffset)
                element.spine = element.spine.map(p => VectorUtil.rotateAroundPoint(p, element.root, angleOffset));
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
        });
    }

    function deriveSize(template, model, levelDimensions, newDataArray, newElements, templateElementIds) {
        let sizeDimens = levelDimensions.filter(d => d.channel == ChannelType.SIZE);
        if (sizeDimens.length > 0) {
            let sizeDimen = sizeDimens[0];
            let sizeValues = newDataArray.flat().filter(v => v.dimensionId == sizeDimen.id).map(v => v.value);
            if (sizeDimen.type == DimensionType.DISCRETE) {
                sizeValues = DataUtil.unique(sizeValues);
                sizeValues.forEach(value => {
                    let mappedElementIds = DataUtil.unmapValue(template, sizeDimen.id, value);
                    let sizes = mappedElementIds.map(eId => DataUtil.getSize(template.getElement(eId), sizeDimen.sizeType));
                    let valueElements = DataUtil.unique(newDataArray.flat().filter(v => v.dimensionId == sizeDimen.id && v.value == value).map(v => newElements[v.row]));
                    for (let i = sizes.length; i < valueElements.length; i++) sizes.push(sizes[i - sizes.length]);
                    valueElements.forEach((element, index) => {
                        let currentSize = DataUtil.getSize(element, sizeDimen.sizeType);
                        let scale = sizes[index] / currentSize;
                        if (sizeDimen.sizeType == SizeType.AREA) scale = Math.sqrt(scale);
                        element.strokes.forEach(stroke => stroke.path = stroke.path.map(p => {
                            return VectorUtil.add(VectorUtil.scale(VectorUtil.subtract(p, element.root), scale), element.root);
                        }))
                        element.spine = element.spine.map(p => {
                            return VectorUtil.add(VectorUtil.scale(VectorUtil.subtract(p, element.root), scale), element.root);
                        });
                    })
                });
            } else if (sizeDimen.type == DimensionType.CONTINUOUS) {
                newElements.forEach((element, row) => {
                    let sizeValue = newDataArray[row].find(v => v.dimensionId == sizeDimen.id).value;
                    sizeValue = parseFloat(sizeValue);
                    let size = DataUtil.unmapValue(template, sizeDimen.id, sizeValue)
                    let scale = size / DataUtil.getSize(element, sizeDimen.sizeType);
                    element.strokes.forEach(stroke => stroke.path = stroke.path.map(p => {
                        return VectorUtil.add(VectorUtil.scale(VectorUtil.subtract(p, element.root), scale), element.root);
                    }))
                    element.spine = element.spine.map(p => {
                        return VectorUtil.add(VectorUtil.scale(VectorUtil.subtract(p, element.root), scale), element.root);
                    })
                });
            }
        }
    }

    function derivePosition(template, model, levelDimensions, newDataArray, newElements, templateElementIds) {
        let positionDimens = levelDimensions.filter(d => d.channel == ChannelType.POSITION);
        if (positionDimens.length > 0) {
            let positionDimen = positionDimens[0];
            let positionValues = newDataArray.flat().filter(v => v.dimensionId == positionDimen.id).map(v => v.value);
            if (positionDimen.type == DimensionType.DISCRETE) {
                positionValues = DataUtil.unique(positionValues);
                positionValues.forEach(value => {
                    let mappedElementIds = DataUtil.unmapValue(template, positionDimen.id, value);
                    let mappedElements = mappedElementIds.map(eId => template.getElement(eId));
                    let mappedParents = mappedElements.map(e => template.getElement(e.parentId));
                    let mappedPercents = mappedElements.map((e, i) => PathUtil.getClosestPointOnPath(e.root, mappedParents[i].spine)).map(p => p.percent).sort();
                    if (mappedPercents.length == 1) {
                        let catIndex = positionDimen.categories.findIndex(c => c.name == value);
                        let topOfRange = catIndex == 0 ? 0 : positionDimen.ranges[catIndex - 1];
                        let bottomOfRange = catIndex == positionDimen.range.length ? 1 : positionDimen.ranges[catIndex];
                        mappedPercents.push(bottomOfRange, topOfRange).sort();
                    }
                    let startPercent = Math.min(...mappedPercents.map(p => p.percent));
                    let endPercent = Math.max(...mappedPercents.map(p => p.percent))
                    let percentIntervals = mappedPositions.map((p, i) => i == 0 ? 0 : p.percent - mappedPositions[i - 1].percent);

                    let valueElements = DataUtil.unique(newDataArray.flat().filter(v => v.dimensionId == positionDimen.id && v.value == value).map(v => newElements[v.row]));
                    for (let i = percentIntervals.length; i < valueElements.length; i++) {
                        percentIntervals.push(percentIntervals[i + 1 - percentIntervals.length]);
                    }
                    percentIntervals = percentIntervals.slice(0, valueElements.length)
                    let totalLength = percentIntervals.reduce((sum, c) => sum + c, 0);
                    let scale = (startPercent - endPercent) / totalLength
                    percentIntervals = percentIntervals.map(v => v * scale);
                    valueElements.forEach((element, index) => {
                        let elementParent = model.getElement(element.parentId);
                        let oldPosition = PathUtil.getClosestPointOnPath(element.root, elementParent.spine);
                        let oldNormal = PathUtil.getNormalForPercent(oldPosition.percent, elementParent.spine);
                        let offset = Math.subtract(element.root, oldPosition);
                        let dist = Math.dist(oldPosition, element.root) * (VectorUtil.dot(offset, oldNormal) > 0 ? 1 : -1);

                        let newPercent = percentIntervals.slice(0, index).reduce((sum, c) => sum + c, 0) + startPercent;
                        let newParentPos = PathUtil.getPositionForPercent(elementParent.spine, newPercent);
                        let newNormal = PathUtil.getNormalForPercent(elementParent.spine, newPercent);
                        let newRoot = VectorUtil.add(VectorUtil.scale(newNormal, dist), newParentPos);

                        let translation = VectorUtil.subtract(newRoot, element.root);
                        let rotation = VectorUtil.rotation(oldNormal, newNormal);
                        translateTreeBranch(model, element.id, translation, rotation);
                    })
                });
            } else if (positionDimen.type == DimensionType.CONTINUOUS) {
                newElements.forEach((element, row) => {
                    let elementParent = model.getElement(element.parentId);
                    let oldPosition = PathUtil.getClosestPointOnPath(element.root, elementParent.spine);
                    let oldNormal = PathUtil.getNormalForPercent(elementParent.spine, oldPosition.percent);
                    let offset = VectorUtil.subtract(element.root, oldPosition);
                    let dist = VectorUtil.dist(oldPosition, element.root) * (VectorUtil.dot(offset, oldNormal) > 0 ? 1 : -1);

                    let positionValue = newDataArray[row].find(v => v.dimensionId == positionDimen.id).value;
                    positionValue = parseFloat(positionValue);
                    let newPercent = DataUtil.unmapValue(template, positionDimen.id, positionValue)
                    let newParentPos = PathUtil.getPositionForPercent(elementParent.spine, newPercent);
                    let newNormal = PathUtil.getNormalForPercent(elementParent.spine, newPercent);
                    let newRoot = VectorUtil.add(VectorUtil.scale(newNormal, dist), newParentPos);

                    let translation = VectorUtil.subtract(newRoot, element.root);
                    let rotation = VectorUtil.rotation(oldNormal, newNormal);
                    translateTreeBranch(model, element.id, translation, rotation);
                });
            }
        } else {
            if (DataUtil.getLevelForElement(newElements[0].id, model) == 0) {
                let positions = DataUtil.unique(templateElementIds).map(id => template.getElement(id).root);
                if (positions.length == 1) {
                    let bb = DataUtil.getBoundingBox(template.getElements());
                    positions.push({ x: positions[0].x + bb.width, y: bb.y + bb.height });
                } else {
                    let xDist = Math.max(...positions.map(p => p.x)) - Math.min(...positions.map(p => p.x));
                    let yDist = Math.max(...positions.map(p => p.y)) - Math.min(...positions.map(p => p.y));
                    if (xDist > yDist) {
                        positions.sort(({ x1, y1 }, { x2, y2 }) => x1 - x2);
                    } else {
                        positions.sort(({ x1, y1 }, { x2, y2 }) => y1 - y2);
                    }
                }

                let elements = DataUtil.unique(newElements);
                let offsets = positions.map((p, i) => VectorUtil.subtract(p, i == 0 ? { x: 0, y: 0 } : positions[i - 1]));
                for (let i = offsets.length; i < elements.length; i++) {
                    offsets.push(offsets[i + 1 - offsets.length]);
                }
                elements.forEach((element, i) => {
                    let newRoot = offsets.slice(0, i + 1).reduce((sum, o) => VectorUtil.add(sum, o), { x: 0, y: 0 });
                    let translation = VectorUtil.subtract(newRoot, element.root)
                    translateTreeBranch(model, element.id, translation, 0);
                })
            }
        }
    }

    function deriveAngle(template, model, levelDimensions, newDataArray, newElements, templateElementIds) {
        let angleDimens = levelDimensions.filter(d => d.channel == ChannelType.ANGLE);
        if (angleDimens.length > 0) {
            let angleDimen = angleDimens[0];
            let angleValues = newDataArray.flat().filter(v => v.dimensionId == angleDimen.id).map(v => v.value);
            if (angleDimen.type == DimensionType.DISCRETE) {
                angleValues = DataUtil.unique(angleValues);
                angleValues.forEach(value => {
                    let valueElements = DataUtil.unique(newDataArray.flat().filter(v => v.dimensionId == angleDimen.id && v.value == value).map(v => newElements[v.row]));
                    let mappedElementIds = DataUtil.unmapValue(template, angleDimen.id, value);
                    let mappedElements = mappedElementIds.map(eId => template.getElement(eId));
                    let mappedAngles;
                    if (angleDimen.angleType == AngleType.ABSOLUTE) {
                        mappedAngles = mappedElements.map(e => e.angle);
                    } else {
                        let mappedParents = mappedElements.map(e => template.getElement(e.parentId));
                        mappedAngles = mappedElements.map((e, i) => DataUtil.getRelativeAngle(e, mappedParents[i]))
                    }
                    for (let i = mappedAngles.length; i < valueElements.length; i++) mappedAngles.push(mappedAngles[i - mappedAngles.length]);

                    valueElements.forEach((element, index) => {
                        let newAngle = mappedAngles[index];
                        let currentAngle;
                        if (angleDimen.angleType == AngleType.ABSOLUTE) {
                            currentAngle = element.angle;
                        } else {
                            let elementParent = model.getElement(element.parentId);
                            currentAngle = DataUtil.getRelativeAngle(element, elementParent);
                        }

                        let rotation = newAngle - currentAngle;
                        translateTreeBranch(model, element.id, { x: 0, y: 0 }, rotation);
                    })
                });
            } else if (angleDimen.type == DimensionType.CONTINUOUS) {
                newElements.forEach((element, row) => {
                    let angleValue = newDataArray[row].find(v => v.dimensionId == angleDimen.id).value;
                    angleValue = parseFloat(angleValue);
                    let newAngle = DataUtil.unmapValue(template, angleDimen.id, angleValue);
                    let currentAngle;
                    if (angleDimen.angleType == AngleType.ABSOLUTE) {
                        currentAngle = element.angle;
                    } else {
                        let elementParent = model.getElement(element.parentId);
                        currentAngle = DataUtil.getRelativeAngle(element, elementParent);
                    }

                    let rotation = newAngle - currentAngle;
                    translateTreeBranch(model, element.id, { x: 0, y: 0 }, rotation);
                });
            }
        }
    }

    function translateTreeBranch(model, elementId, translate, rotate) {
        let element = model.getElement(elementId);
        model.getElementDecendants(elementId).forEach(decendant => {
            decendant.root = VectorUtil.rotateAroundPoint(decendant.root, element.root, rotate)
            decendant.angle = VectorUtil.rotate(element.angle, rotate);
            decendant.strokes.forEach(stroke => stroke.path = stroke.path.map(p => VectorUtil.rotateAroundPoint(p, element.root, rotate)));
            decendant.spine = decendant.spine.map(p => VectorUtil.rotateAroundPoint(p, element.root, rotate));
            decendant.root = VectorUtil.add(decendant.root, translate);
            decendant.strokes.forEach(stroke => stroke.path = PathUtil.translate(stroke.path, translate));
            decendant.spine = PathUtil.translate(decendant.spine, translate)
        })
        element.angle = VectorUtil.rotate(element.angle, rotate);
        element.strokes.forEach(stroke => stroke.path = stroke.path.map(p => VectorUtil.rotateAroundPoint(p, element.root, rotate)));
        element.spine = element.spine.map(p => VectorUtil.rotateAroundPoint(p, element.root, rotate));
        element.strokes.forEach(stroke => stroke.path = PathUtil.translate(stroke.path, translate));
        element.root = VectorUtil.add(element.root, translate);
        element.spine = PathUtil.translate(element.spine, translate)
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
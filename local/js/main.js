import { ChannelType, DimensionType } from "./constants.js";
import { DashboardController } from "./controllers/dashboard_controller.js";
import { ModelController } from "./controllers/model_controller.js";
import { ServerController } from "./controllers/server_controller.js";
import { MemoryStash, VersionController } from "./controllers/version_controller.js";
import { DataModel } from "./data_model.js";
import { Data } from "./data_structs.js";
import { EventManager } from "./event_manager.js";
import { FileHandler } from "./file_handler.js";
import { DataUtil } from "./utils/data_util.js";
import { IdUtil } from "./utils/id_util.js";
import { ModelUtil } from "./utils/model_util.js";
import { PathUtil } from "./utils/path_util.js";
import { StructureFairy } from "./utils/structure_fairy.js";
import { VectorUtil } from "./utils/vector_util.js";

document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();
    let mDashboardController = new DashboardController();

    new EventManager(mDashboardController);

    let mVersionController = new VersionController();
    mVersionController.setStash(new MemoryStash()).then(() => {
        mVersionController.stack(mModelController.getModel().toObject());
    });

    mDashboardController.setNewStrokeCallback((stroke) => {
        let model = mModelController.getModel();
        let mergeGroup = StructureFairy.getMerge(stroke, model);
        if (mergeGroup.length) {
            let element = mergeGroup[0];
            element.strokes.push(stroke);
            mModelController.updateElement(element)
        } else {
            let parentId = StructureFairy.getParent(stroke, mModelController.getModel());

            let element = new Data.Element();
            element.strokes.push(stroke);
            element.spine = DataUtil.getStupidSpine(element);
            element.root = element.spine[0];
            element.angle = VectorUtil.normalize(VectorUtil.subtract(element.spine[1], element.spine[0]));
            mModelController.addElement(element);
            if (parentId) {
                ModelUtil.updateParent(parentId, element.id, mModelController);

                model = mModelController.getModel();
                let parent = model.getElement(parentId);
                let axis = DataUtil.getLongestAxis(element);
                let p1 = PathUtil.getClosestPointOnPath(axis[0], parent.spine);
                let p2 = PathUtil.getClosestPointOnPath(axis[1], parent.spine);
                element = model.getElement(element.id);
                if (VectorUtil.dist(p1, axis[0]) < VectorUtil.dist(p2, axis[1])) {
                    element.root = axis[0];
                    element.angle = VectorUtil.normalize(VectorUtil.subtract(axis[1], axis[0]))
                } else {
                    element.root = axis[1];
                    element.angle = VectorUtil.normalize(VectorUtil.subtract(axis[0], axis[1]))
                }
                mModelController.updateElement(element);
            }

            model = mModelController.getModel();
            let tier = DataUtil.getTier(model, element.id);
            ModelUtil.autoClusterTierDimensions(tier, mModelController);
        }

        mDashboardController.modelUpdate(mModelController.getModel());
        mVersionController.stack(mModelController.getModel().toObject());
    })

    mDashboardController.setTranslateStrokesCallback((strokeIds, translation) => {
        let model = mModelController.getModel();
        strokeIds.forEach(strokeId => {
            let stroke = model.getStroke(strokeId);
            if (!stroke) { console.error("Invalid stroke id", strokeId); return; }
            stroke.path = stroke.path.map(p => VectorUtil.add(p, translation));
            mModelController.updateStroke(stroke);
        });

        let elements = DataUtil.unique(strokeIds.map(s => model.getElementForStroke(s)).filter(e => e));
        elements.forEach(element => {
            if (element.strokes.every(s => strokeIds.includes(s.id))) {
                element.spine = element.spine.map(p => VectorUtil.add(p, translation));
                element.root = VectorUtil.add(element.root, translation);
                if (element.parentId) {
                    let parentElement = mModelController.getModel().getElement(element.parentId)
                    if (parentElement) {
                        let closestPosition = PathUtil.getClosestPointOnPath(element.root, parentElement.spine);
                        element.position = closestPosition.percent;
                    }
                }
                mModelController.updateElement(element);
            }
        });


        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setUpdateAngleCallback((elementId, root, angle) => {
        let element = mModelController.getModel().getElement(elementId);
        if (!element) { console.error("invalid element id", elementId); return; }
        element.root = root;
        element.angle = angle;
        mModelController.updateElement(element);
        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setParentUpdateCallback((elementIds, parentElementId) => {
        elementIds.forEach(elementId => {
            ModelUtil.updateParent(parentElementId, elementId, mModelController);
        });

        // get the model again so all the elements will have the correct data.
        let model = mModelController.getModel();
        let parent = null;
        if (parentElementId) {
            parent = mModelController.getModel().getElement(parentElementId);
            if (!parent) { console.error("Invalid element id", parentElementId); return; }
        }
        let tiers = [];
        elementIds.forEach(elementId => {
            // update position
            let element = model.getElement(elementId);
            if (!element) { console.error("Invalid element id", elementId); return; }
            if (parent) {
                let projection = PathUtil.getClosestPointOnPath(element.root, parent.spine);
                element.position = projection.percent;
            } else {
                element.position = null;
            }
            mModelController.updateElement(element);

            tiers.push(DataUtil.getTier(model, element.id));
        });

        DataUtil.unique(tiers).forEach(tier => {
            ModelUtil.autoClusterTierDimensions(tier, mModelController);
        })

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setAddDimensionCallback(() => {
        let maxNum = Math.max(0, ...mModelController.getModel().getDimensions()
            .map(d => d.name.startsWith("Dimension") ? parseInt(d.name.slice(9)) : 0)
            .filter(n => !isNaN(n)))
        let newDimension = new Data.Dimension();
        newDimension.name = "Dimension" + (maxNum + 1);
        newDimension.type = DimensionType.DISCRETE;
        newDimension.channel = ChannelType.FORM;
        newDimension.tier = 0;
        mModelController.addDimension(newDimension);

        let levels = StructureFairy.getCluster(newDimension.id, mModelController.getModel());
        if (levels) {
            newDimension.levels = levels;
            mModelController.updateDimension(newDimension);
        }

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());

        return newDimension;
    })

    mDashboardController.setAddLevelCallback((dimenId) => {
        let model = mModelController.getModel();
        let dimension = model.getDimension(dimenId);
        if (!dimension) { console.error("Invalid dimension id", dimenId); return; }

        let newLevel = new Data.Level();
        newLevel.name = "Category" + (Math.max(0, ...dimension.levels
            .map(l => l.name.startsWith("Category") ? parseInt(l.name.slice(8)) : 0)
            .filter(n => !isNaN(n))) + 1);
        dimension.levels.push(newLevel)

        if (dimension.levels.length > 1) {
            let lastRange = dimension.ranges.length ? dimension.ranges[dimension.ranges.length - 1] : 0;
            dimension.ranges.push((1 - lastRange) / 2 + lastRange)
        }

        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setUpdateLevelCallback((dimenId, levelId, elementIds) => {
        let model = mModelController.getModel();
        let dimension = model.getDimension(dimenId);

        // Validation
        elementIds = elementIds.map(eId => {
            let e = model.getElement(eId);
            if (!e) { console.error("Invalid element id!", eId); return null; };
            return e;
        }).filter(e => e).map(e => e.id);

        dimension.levels.forEach(level => {
            if (level.id == levelId) {
                level.elementIds = DataUtil.unique(level.elementIds.concat(elementIds));
            } else {
                level.elementIds = level.elementIds.filter(e => !elementIds.includes(e));
            }
            mModelController.updateLevel(level);
        });

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setLevelOrderUpdateCallback((dimenId, newOrder) => {
        let model = mModelController.getModel();
        let dimension = model.getDimension(dimenId);

        let levels = dimension.levels;
        dimension.levels = [];
        newOrder.forEach(levelId => {
            dimension.levels.push(levels.find(l => l.id == levelId));
        });

        dimension.levels = dimension.levels.filter(l => l);
        if (dimension.levels.length != levels.length) { console.error("Inavalid order!"); return; }

        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateRangeControlCallback((dimenId, rangeIndex, percent) => {
        let model = mModelController.getModel();
        let dimension = model.getDimension(dimenId);

        dimension.ranges = dimension.ranges.map((range, index) => {
            if (index == rangeIndex) return percent;
            if (index < rangeIndex) return range > percent ? percent : range;
            if (index > rangeIndex) return range < percent ? percent : range;
        })

        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateLevelNameCallback((levelId, name) => {
        let level = mModelController.getModel().getLevel(levelId);
        if (!level) { console.error("Invalid level id: ", levelId); return; }
        level.name = name;
        mModelController.updateLevel(level);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimensionNameCallback((dimensionId, name) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        dimension.name = name;
        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimensionDomainCallback((dimensionId, domain) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        // TODO: Validate the domain!
        dimension.domain = domain;
        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimensionTypeCallback((dimensionId, type) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        dimension.type = type;

        mModelController.updateDimension(dimension);

        let levels = StructureFairy.getCluster(dimensionId, mModelController.getModel());
        if (levels) {
            dimension = mModelController.getModel().getDimension(dimensionId);
            dimension.levels = levels;
            mModelController.updateDimension(dimension);
        }

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimensionChannelCallback((dimensionId, channel) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if ((dimension.channel == ChannelType.FORM && channel == ChannelType.COLOR) ||
            (dimension.channel == ChannelType.COLOR && channel == ChannelType.FORM)) {
            dimension.levels.forEach(l => l.elementIds = []);
        }
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        dimension.channel = channel;
        mModelController.updateDimension(dimension);

        let levels = StructureFairy.getCluster(dimensionId, mModelController.getModel());
        if (levels) {
            dimension = mModelController.getModel().getDimension(dimensionId);
            dimension.levels = levels;
            mModelController.updateDimension(dimension);
        }

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimensionTierCallback((dimensionId, tier) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        dimension.tier = tier;
        mModelController.updateDimension(dimension);

        let levels = StructureFairy.getCluster(dimensionId, mModelController.getModel());
        if (levels) {
            dimension = mModelController.getModel().getDimension(dimensionId);
            dimension.levels = levels;
            mModelController.updateDimension(dimension);
        }

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateColorCallback((ids, color) => {
        let model = mModelController.getModel();
        let elementIds = [];
        ids.forEach(id => {
            let element;
            if (IdUtil.isType(id, Data.Element)) {
                element = model.getElement(id);
                element.strokes.forEach(stroke => stroke.color = color);
                mModelController.updateElement(element);
            } else if (IdUtil.isType(id, Data.Stroke)) {
                let stroke = model.getStroke(id);
                stroke.color = color;
                mModelController.updateStroke(stroke);
                element = model.getElementForStroke(stroke.id);
            }
            elementIds.push(element.id);
        });

        model.getDimensions().filter(d => d.channel == ChannelType.COLOR).forEach(dimen => {
            dimen.levels.forEach(l => l.elementIds = l.elementIds.filter(eId => !elementIds.includes(eId)));
            mModelController.updateDimension(dimen);
        })
        DataUtil.unique(elementIds.map(eId => DataUtil.getTier(model, eId))).forEach(tier => {
            ModelUtil.autoClusterTierDimensions(tier, mModelController);
        });

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUndoCallback(async () => {
        let obj = await mVersionController.reverse();
        if (obj) {
            mModelController.setModel(DataModel.fromObject(obj));
            mDashboardController.modelUpdate(mModelController.getModel());
        }
    })

    mDashboardController.setRedoCallback(async () => {
        let obj = await mVersionController.advance();
        if (obj) {
            mModelController.setModel(DataModel.fromObject(obj));
            mDashboardController.modelUpdate(mModelController.getModel());
        }
    })

    mDashboardController.setDeleteCallback((selection) => {
        selection.filter(id => IdUtil.isType(id, Data.Element)).forEach(elementId => {
            ModelUtil.removeElement(elementId, mModelController);
        })
        selection.filter(id => IdUtil.isType(id, Data.Stroke)).forEach(strokeId => {
            mModelController.removeStroke(strokeId);
            ModelUtil.clearEmptyElements(mModelController);
        })
        selection.filter(id => IdUtil.isType(id, Data.Dimension)).forEach(dimensionId => {
            mModelController.removeDimension(dimensionId);
        })
        selection.filter(id => IdUtil.isType(id, Data.Level)).forEach(levelId => {
            let model = mModelController.getModel();
            let dimen = model.getDimenstionForLevel(levelId);
            let index = dimen.levels.findIndex(l => l.id == levelId);
            dimen.levels.splice(index, 1);
            dimen.ranges.splice(index, 1);
            mModelController.updateDimension(dimen);
        })
        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setMergeCallback((strokeIds, elementTarget = null) => {
        let model = mModelController.getModel();

        let element;
        if (elementTarget) {
            element = model.getElement(elementTarget);
            if (!element) { console.error("Invalid element id!", elementTarget); return; }
        } else {
            element = new Data.Element();
        }

        let elementStrokes = element.strokes.map(s => s.id);
        let strokes = strokeIds.filter(sId => !elementStrokes.includes(sId)).map(s => model.getStroke(s));
        element.strokes.push(...strokes);

        if (!elementTarget) {
            // new element, set all the things
            element.spine = DataUtil.getStupidSpine(element);
            element.root = element.spine[0];
            element.angle = VectorUtil.normalize(VectorUtil.subtract(element.spine[1], element.spine[0]));
            // count the elements, if most of the strokes belong to one, make the new element
            // a sibling of that element
            let elements = strokeIds.map(s => model.getElementForStroke(s));
            let elementCounts = elements.reduce((count, element) => {
                count[element.id] ? ++count[element.id] : count[element.id] = 1;
                return count;
            }, {});
            let topElement = Object.entries(elementCounts).sort((a, b) => a[1] - b[1])[0];
            if (topElement[1] / strokes.length > 0.5) {
                element.parentId = elements.find(e => e.id == topElement[0]).parentId;
            }
        }

        strokeIds.forEach(s => mModelController.removeStroke(s));

        if (!elementTarget) {
            mModelController.addElement(element);
        } else {
            mModelController.updateElement(element);
        }

        // if we just stole all the strokes of an element, steal it's children to. 
        model = mModelController.getModel();
        let emptyElements = model.getElements().filter(e => e.strokes.length == 0).map(e => e.id);
        let emptyElementsChildren = model.getElements().filter(e => e.strokes.length > 0 && e.id != element.id && emptyElements.includes(e.parentId));
        emptyElementsChildren.forEach(child => {
            ModelUtil.updateParent(element.id, child.id, mModelController);
        });
        ModelUtil.clearEmptyElements(mModelController);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setCalculateSpineCallback((elementId) => {
        let element = mModelController.getModel().getElement(elementId);
        if (!element) { console.error("Invalid element id", elementId); return; }
        ServerController.getSpine(element).then(result => {
            element = mModelController.getModel().getElement(elementId);
            if (!result) {
                result = DataUtil.getStupidSpine(element);
            }
            element.spine = result;
            mModelController.updateElement(element);
            mVersionController.stack(mModelController.getModel().toObject());
            mDashboardController.modelUpdate(mModelController.getModel());
        })
    });

    mDashboardController.setLoadModelCallback(async () => {
        try {
            let model = await FileHandler.getJSONModel();
            if (model) {
                mModelController.setModel(DataModel.fromObject(model));
                mVersionController.stack(mModelController.getModel().toObject());
                mDashboardController.modelUpdate(mModelController.getModel());
            }
        } catch (e) {
            console.error(e);
        }
    })
});
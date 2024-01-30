import { ChannelType, DIMENSION_RANGE_V1, DIMENSION_RANGE_V2, DimensionType, MAP_ELEMENTS, NO_CATEGORY_ID } from "./constants.js";
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
        if (VectorUtil.dist(root, element.spine[0]) > VectorUtil.dist(root, element.spine[element.spine.length - 1])) {
            element.spine = element.spine.reverse();
        }

        mModelController.updateElement(element);
        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setUpdateSpineCallback((elementId, spine) => {
        let element = mModelController.getModel().getElement(elementId);
        if (!element) { console.error("invalid element id", elementId); return; }
        element.spine = spine;
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
        let model = mModelController.getModel();
        let maxNum = Math.max(0, ...model.getDimensions()
            .map(d => d.name.startsWith("Dimension") ? parseInt(d.name.slice(9)) : 0)
            .filter(n => !isNaN(n)))
        let maxTier = Math.max(0, ...model.getElements().map(e => DataUtil.getTier(model, e.id)));
        let newDimension = new Data.Dimension();
        newDimension.name = "Dimension" + (maxNum + 1);
        newDimension.type = DimensionType.DISCRETE;
        newDimension.channel = ChannelType.FORM;
        newDimension.tier = maxTier;
        mModelController.addDimension(newDimension);

        let categories = StructureFairy.getCluster(newDimension.id, mModelController.getModel());
        if (categories) {
            let noMapping = categories.find(l => l.id == NO_CATEGORY_ID).elementIds;
            newDimension.unmappedIds = noMapping;
            newDimension.categories = categories.filter(l => l.id != NO_CATEGORY_ID);

            mModelController.updateDimension(newDimension);
        }

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());

        return newDimension;
    })

    mDashboardController.setAddCategoryCallback((dimenId) => {
        let model = mModelController.getModel();
        let dimension = model.getDimension(dimenId);
        if (!dimension) { console.error("Invalid dimension id", dimenId); return; }

        let newCategory = new Data.Category();
        newCategory.name = "Category" + (Math.max(0, ...dimension.categories
            .map(l => l.name.startsWith("Category") ? parseInt(l.name.slice(8)) : 0)
            .filter(n => !isNaN(n))) + 1);
        dimension.categories.push(newCategory)

        if (dimension.categories.length > 1) {
            let lastRange = dimension.ranges.length ? dimension.ranges[dimension.ranges.length - 1] : 0;
            dimension.ranges.push((1 - lastRange) / 2 + lastRange)
        }

        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setUpdateCategoryCallback((dimenId, categoryId, elementIds) => {
        let model = mModelController.getModel();
        let dimension = model.getDimension(dimenId);

        // Validation
        elementIds = elementIds.map(eId => {
            let e = model.getElement(eId);
            if (!e) { console.error("Invalid element id!", eId); return null; };
            return e;
        }).filter(e => e).map(e => e.id);

        if (categoryId == NO_CATEGORY_ID) {
            dimension.unmappedIds = DataUtil.unique(dimension.unmappedIds.concat(elementIds));
        } else {
            dimension.unmappedIds = dimension.unmappedIds.filter(e => !elementIds.includes(e));
            if (categoryId == MAP_ELEMENTS) {
                let setIds = dimension.categories.map(l => l.elementIds).flat();
                let unsetIds = elementIds.filter(eId => !setIds.includes(eId));
                if (dimension.categories.length == 0) {
                    let newCategory = new Data.Category();
                    newCategory.name = "Category1";
                    dimension.categories.push(newCategory)
                }
                dimension.categories[0].elementIds = DataUtil.unique(dimension.categories[0].elementIds.concat(unsetIds));
            } else {
                dimension.categories.forEach(category => {
                    if (category.id == categoryId) {
                        category.elementIds = DataUtil.unique(category.elementIds.concat(elementIds));
                    } else {
                        category.elementIds = category.elementIds.filter(e => !elementIds.includes(e));
                    }
                });
            }
        }

        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setCategoryOrderUpdateCallback((dimenId, newOrder) => {
        let model = mModelController.getModel();
        let dimension = model.getDimension(dimenId);

        let categories = dimension.categories;
        dimension.categories = [];
        newOrder.forEach(categoryId => {
            dimension.categories.push(categories.find(l => l.id == categoryId));
        });

        dimension.categories = dimension.categories.filter(l => l);
        if (dimension.categories.length != categories.length) { console.error("Inavalid order!"); return; }

        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateRangeControlCallback((dimenId, rangeIndex, percent) => {
        let model = mModelController.getModel();
        let dimension = model.getDimension(dimenId);

        if (rangeIndex == DIMENSION_RANGE_V1) {
            dimension.domainRange = [percent, dimension.domainRange[1]].sort();
        } else if (rangeIndex == DIMENSION_RANGE_V2) {
            dimension.domainRange = [percent, dimension.domainRange[0]].sort();
        } else {
            dimension.ranges = dimension.ranges.map((range, index) => {
                if (index == rangeIndex) return percent;
                if (index < rangeIndex) return range > percent ? percent : range;
                if (index > rangeIndex) return range < percent ? percent : range;
            })
        }

        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateCategoryNameCallback((categoryId, name) => {
        let category = mModelController.getModel().getCategory(categoryId);
        if (!category) { console.error("Invalid category id: ", categoryId); return; }
        category.name = name;
        mModelController.updateCategory(category);

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

        let categories = StructureFairy.getCluster(dimensionId, mModelController.getModel());
        if (categories) {
            dimension = mModelController.getModel().getDimension(dimensionId);

            let noMapping = categories.find(l => l.id == NO_CATEGORY_ID).elementIds;
            dimension.unmappedIds = noMapping;
            dimension.categories = categories.filter(l => l.id != NO_CATEGORY_ID);

            mModelController.updateDimension(dimension);
        }

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimensionChannelCallback((dimensionId, channel) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if ((dimension.channel == ChannelType.FORM && channel == ChannelType.COLOR) ||
            (dimension.channel == ChannelType.COLOR && channel == ChannelType.FORM)) {
            dimension.categories.forEach(l => l.elementIds = []);
        }
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        dimension.channel = channel;
        mModelController.updateDimension(dimension);

        let categories = StructureFairy.getCluster(dimensionId, mModelController.getModel());
        if (categories) {
            dimension = mModelController.getModel().getDimension(dimensionId);
            let noMapping = categories.find(l => l.id == NO_CATEGORY_ID).elementIds;
            dimension.unmappedIds = noMapping;
            dimension.categories = categories.filter(l => l.id != NO_CATEGORY_ID);
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

        let categories = StructureFairy.getCluster(dimensionId, mModelController.getModel());
        if (categories) {
            dimension = mModelController.getModel().getDimension(dimensionId);
            let noMapping = categories.find(l => l.id == NO_CATEGORY_ID).elementIds;
            dimension.unmappedIds = noMapping;
            dimension.categories = categories.filter(l => l.id != NO_CATEGORY_ID);
            mModelController.updateDimension(dimension);
        }

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateAngleTypeCallback((dimensionId, type) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        dimension.angleType = type;
        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateSizeTypeCallback((dimensionId, type) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        dimension.sizeType = type;
        mModelController.updateDimension(dimension);

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
            dimen.categories.forEach(l => l.elementIds = l.elementIds.filter(eId => !elementIds.includes(eId)));
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
        selection.filter(id => IdUtil.isType(id, Data.Category)).forEach(categoryId => {
            let model = mModelController.getModel();
            let dimen = model.getDimenstionForCategory(categoryId);
            let index = dimen.categories.findIndex(l => l.id == categoryId);
            dimen.categories.splice(index, 1);
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
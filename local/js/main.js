document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();
    let mDashboardController = new DashboardController();

    new EventManager(mDashboardController);

    let mVersionController = new VersionController();
    mVersionController.setStash(new MemoryStash()).then(() => {
        mVersionController.stack(mModelController.getModel().toObject());
    });

    mDashboardController.setNewStrokeCallback((stroke) => {
        let element = new Data.Element();
        element.strokes.push(stroke);
        element.spine = DataUtil.getStupidSpine(element);
        element.root = element.spine[0];
        element.angle = VectorUtil.normalize(VectorUtil.subtract(element.spine[1], element.spine[0]));

        mModelController.addElement(element);

        mDashboardController.modelUpdate(mModelController.getModel());
        mVersionController.stack(mModelController.getModel().toObject());
    })

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
        });

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

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());

        return newDimension;
    })

    mDashboardController.setAddLevelCallback((dimenId) => {
        let model = mModelController.getModel();
        let dimention = model.getDimension(dimenId);
        if (!dimention) { console.error("Invalid dimention id", dimenId); return; }
        let maxNum = Math.max(0, ...dimention.levels
            .map(l => l.name.startsWith("Level") ? parseInt(l.name.slice(5)) : 0)
            .filter(n => !isNaN(n)))

        let newLevel = new Data.Level();
        newLevel.name = "Level" + (maxNum + 1);
        mModelController.addLevel(dimenId, newLevel);

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
        // Continuous dimensions are restricted to continuous channels. 
        if (dimension.type == DimensionType.CONTINUOUS &&
            (dimension.channel == ChannelType.FORM || dimension.channel == ChannelType.COLOR)) {
            dimension.channel = ChannelType.SIZE;
        }

        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimensionChannelCallback((dimensionId, channel) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        dimension.channel = channel;
        // Continuous dimensions are restricted to continuous channels. 
        if ((channel == ChannelType.FORM || channel == ChannelType.COLOR) &&
            dimension.type == DimensionType.CONTINUOUS) {
            dimension.type = DimensionType.DISCRETE;
        } else if (channel == ChannelType.POSITION) {
            if (dimension.tier < 1) {
                dimension.tier = 1;
            }
        }
        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimensionTierCallback((dimensionId, tier) => {
        let dimension = mModelController.getModel().getDimension(dimensionId);
        if (!dimension) { console.error("Invalid dimension id: ", dimensionId); return; }
        dimension.tier = tier;
        if (tier == 0 && dimension.channel == ChannelType.POSITION) {
            dimension.channel = ChannelType.SIZE;
        }
        mModelController.updateDimension(dimension);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setMergeElementCallback((selection, mergeElementId) => {
        ModelUtil.mergeElements(mModelController, selection, mergeElementId);

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
        // Delete everything in the selection
    })

    mDashboardController.setMergeStrokesCallback((strokeIds) => {
        let model = mModelController.getModel();
        let strokes = strokeIds.map(s => model.getStroke(s));

        let newElement = new Data.Element();
        newElement.strokes.push(...strokes);
        newElement.spine = DataUtil.getStupidSpine(newElement);
        newElement.root = newElement.spine[0];
        newElement.angle = VectorUtil.normalize(VectorUtil.subtract(newElement.spine[1], newElement.spine[0]));

        // count the elements, if most of the strokes belong to one, make the new element
        // a sibling of that element
        let elements = strokeIds.map(s => model.getElementForStroke(s));
        let elementCounts = elements.reduce((count, element) => {
            count[element.id] ? ++count[element.id] : count[element.id] = 1;
            return count;
        }, {});
        let topElement = Object.entries(elementCounts).sort((a, b) => a[1] - b[1])[0];
        if (topElement[1] / strokes.length > 0.5) {
            newElement.parentId = elements.find(e => e.id == topElement[0]).parentId;
        }

        strokeIds.forEach(s => mModelController.removeStroke(s));
        ModelUtil.clearEmptyElements(mModelController);
        mModelController.addElement(newElement);

        mVersionController.stack(mModelController.getModel().toObject());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setAutoMergeElements((strokeIds) => {
        let elements = DataUtil.unique(strokeIds.map(s => mModelController.getModel().getElementForStroke(s)));
        ServerController.suggestMerge(elements).then(merge => {
            let elements = mModelController.getModel().getElements();

            // reconcile the algorithm results with the curdrent state. 
            let elementStrips = elements.map(element => {
                return {
                    id: element.id,
                    strips: DataUtil.unique(element.strokes
                        .map(s => merge.findIndex(g => g.includes(s.id)))
                        .filter(index => index != -1))
                }
            }).filter(elementData => elementData.strips.length > 0);

            let hasChanged = false;
            let singletons = elementStrips.filter(s => s.strips.length == 1);
            let nonSingletons = elementStrips.filter(s => s.strips.length > 1)

            nonSingletons.forEach(elementData => {
                elementData.strips.forEach(sId => {
                    let mergies = singletons.filter(s => s.strips[0] == sId).map(ed => ed.id);
                    singletons = singletons.filter(s => s.strips[0] != sId);
                    ModelUtil.mergeElements(mModelController, mergies, elementData.id);
                    hasChanged = true;
                })
            })

            let merges = {};
            singletons.forEach(elementData => {
                if (!merges[elementData.strips[0]]) merges[elementData.strips[0]] = [];
                merges[elementData.strips[0]].push(elementData.id);
            });
            Object.values(merges).forEach(merge => {
                if (merge.length > 1) {
                    let mergeElements = elements.filter(e => merge.includes(e.id));
                    let oldestElement = mergeElements.reduce((prev, cur) => (cur.creationTime < prev.creationTime) ? cur : prev);
                    ModelUtil.mergeElements(mModelController, mergeElements.map(e => e.id).filter(id => id != oldestElement.id), oldestElement.id);
                    hasChanged = true;
                }
            });
            if (hasChanged) {
                mDashboardController.modelUpdate(mModelController.getModel());
                mVersionController.stack(mModelController.getModel().toObject());
            }
        });
    });

    mDashboardController.setCalculateSpineCallback((elementId) => {
        let element = mModelController.getModel().getElement(elementId);
        if (!element) { console.error("Invalid element id", elementId); return; }
        ServerController.getSpine(element).then(result => {
            if (result) {
                element = mModelController.getModel().getElement(elementId);
                element.spine = result;
                mModelController.updateElement(element);
                mVersionController.stack(mModelController.getModel().toObject());
                mDashboardController.modelUpdate(mModelController.getModel());
            }
        });
    });
});
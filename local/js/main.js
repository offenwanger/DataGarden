document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();
    let mDashboardController = new DashboardController();

    new EventManager(mDashboardController);

    let mVersionController = new VersionController();

    let mLastStrokeStacked = Date.now();
    mVersionController.setStash(new MemoryStash());

    mDashboardController.setNewStrokeCallback((stroke) => {
        let model = mModelController.getModel();

        let element = new Data.Element();
        element.strokes.push(stroke);
        element.spine = ModelUtil.getStupidSpine(element);
        mModelController.addElement(element);

        mDashboardController.modelUpdate(mModelController.getModel());

        if (Date.now() - mLastStrokeStacked > 5000) {
            mVersionController.stack(mModelController.getModel());
            mLastStrokeStacked = Date.now();
        } else {
            mVersionController.replace(mModelController.getModel());
        }
    })

    mDashboardController.setParentUpdateCallback((elementIds, parentElementId) => {
        elementIds.forEach(elementId => {
            ModelUtil.updateParent(parentElementId, elementId, mModelController)
        })

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setAddDimentionCallback(() => {
        let newDimention = new Data.Dimention();
        newDimention.name = "Dimention";
        newDimention.type = DimentionType.DISCRETE;
        newDimention.channel = ChannelType.FORM;
        newDimention.tier = 0;

        mModelController.addDimention(newDimention);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());

        return newDimention;
    })

    mDashboardController.setAddLevelCallback((dimenId) => {
        let newLevel = new Data.Level();
        newLevel.name = "Level";
        mModelController.addLevel(dimenId, newLevel);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setUpdateLevelCallback((dimenId, levelId, elementIds) => {
        let model = mModelController.getModel();
        let dimention = model.getDimention(dimenId);

        // Validation
        elementIds = elementIds.map(eId => {
            let e = model.getElement(eId);
            if (!e) { console.error("Invalid element id!", eId); return null; };
            return e;
        }).filter(e => e).map(e => e.id);

        dimention.levels.forEach(level => {
            if (level.id == levelId) {
                level.elementIds = DataUtil.unique(level.elementIds.concat(elementIds));
            } else {
                level.elementIds = level.elementIds.filter(e => !elementIds.includes(e));
            }
            mModelController.updateLevel(level);
        });

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setUpdateLevelNameCallback((levelId, name) => {
        let level = mModelController.getModel().getLevel(levelId);
        if (!level) { console.error("Invalid level id: ", levelId); return; }
        level.name = name;
        mModelController.updateLevel(level);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimentionNameCallback((dimentionId, name) => {
        let dimention = mModelController.getModel().getDimention(dimentionId);
        if (!dimention) { console.error("Invalid dimention id: ", dimentionId); return; }
        dimention.name = name;
        mModelController.updateDimention(dimention);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimentionTypeCallback((dimentionId, type) => {
        let dimention = mModelController.getModel().getDimention(dimentionId);
        if (!dimention) { console.error("Invalid dimention id: ", dimentionId); return; }
        dimention.type = type;
        mModelController.updateDimention(dimention);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimentionChannelCallback((dimentionId, channel) => {
        let dimention = mModelController.getModel().getDimention(dimentionId);
        if (!dimention) { console.error("Invalid dimention id: ", dimentionId); return; }
        dimention.channel = channel;
        mModelController.updateDimention(dimention);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUpdateDimentionTierCallback((dimentionId, tier) => {
        let dimention = mModelController.getModel().getDimention(dimentionId);
        if (!dimention) { console.error("Invalid dimention id: ", dimentionId); return; }
        dimention.tier = tier;
        mModelController.updateDimention(dimention);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setMergeElementCallback((selection, mergeElementId) => {
        ModelUtil.mergeElements(mModelController, selection, mergeElementId);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setNewElementCallback((childStrokeId) => {
        let stroke = mModelController.getModel().getStroke(childId);
        let element = new Data.Element();
        element.strokes.push(stroke);
        element.spine = ModelUtil.getStupidSpine(element);
        mModelController.removeStroke(childStrokeId);
        mModelController.addElement(element);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setUndoCallback(async () => {
        let obj = await mVersionController.reverse();
        if (obj) {
            if (Array.isArray(obj)) {
                // update the selection
            } else {
                mModelController.setModel(DataModel.fromObject(obj));
                mDashboardController.modelUpdate(mModelController.getModel());
            }
        }
    })

    mDashboardController.setRedoCallback(async () => {
        let obj = await mVersionController.advance();
        if (obj) {
            if (Array.isArray(obj)) {
                // update the selection
            } else {
                mModelController.setModel(DataModel.fromObject(obj));
                mDashboardController.modelUpdate(mModelController.getModel());
            }
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
        newElement.spine = ModelUtil.getStupidSpine(newElement);

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

        mVersionController.stack(mModelController.getModel());
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
                mVersionController.stack(mModelController.getModel());
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
                mVersionController.stack(mModelController.getModel());
                mDashboardController.modelUpdate(mModelController.getModel());
            }
        });
    });
});
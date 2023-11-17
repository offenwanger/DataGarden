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

        let group;
        if (model.getGroups().length == 0) {
            group = new Data.Group();
            group.elements.push(element);
            mModelController.addGroup(group);
        } else {
            mModelController.addElement(model.getGroups().find(g => !g.parentId).id, element);
        }

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

    mDashboardController.setMergeElementCallback((selection, mergeElementId) => {
        ModelUtil.mergeElements(mModelController, selection, mergeElementId);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setNewElementCallback((groupId, childStrokeId) => {
        let stroke = mModelController.getModel().getStroke(childId);
        let element = new Data.Element();
        element.strokes.push(stroke);
        element.spine = ModelUtil.getStupidSpine(element);
        mModelController.removeStroke(childStrokeId);
        mModelController.addElement(groupId, element);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setMoveElementCallback((groupId, elementId) => {
        let element = mModelController.getModel().getElement(elementId);
        mModelController.removeElement(elementId);
        mModelController.addElement(groupId, element);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setMoveStrokeCallback((elementId, strokeId) => {
        let stroke = mModelController.getModel().getStroke(strokeId);
        mModelController.removeStroke(stroke);
        mModelController.addStroke(elementId, stroke);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    })

    mDashboardController.setNewGroupCallback((childId) => {
        let element;
        if (IdUtil.isType(childId, Data.Stroke)) {
            let stroke = mModelController.getModel().getStroke(childId);
            element = new Data.Element();
            element.strokes.push(stroke);
            element.spine = ModelUtil.getStupidSpine(element);

            mModelController.removeStroke(childId);
        } else if (IdUtil.isType(childId, Data.Element)) {
            element = mModelController.getModel().getElement(childId);

            mModelController.removeElement(childId);
        } else { console.error("invalid id", childId); return; }

        let group = new Data.Group();
        group.elements.push(element);
        mModelController.addGroup(group);

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

    mDashboardController.setNewDimentionCallback((groupId, channelType) => {
        if (!IdUtil.isType(groupId, Data.Group)) { console.error("Bad state, not a group", groupId); return; }
        let group = mModelController.getModel().getGroup(groupId);
        if (!group) { console.error("Bad state, group not found", groupId); return; }

        let newDimention = new Data.Dimention();
        newDimention.levels.push(new Data.Level());
        newDimention.levels[0].name = "Level";

        let newMapping = new Data.Mapping();
        newMapping.dimention = newDimention.id;
        newMapping.channelType = channelType;
        newMapping.levels.push(newDimention.levels[0].id);
        if (channelType == ChannelType.FORM || channelType == ChannelType.COLOR) {
            newMapping.groups.push(group.elements.map(e => e.id));
        } else if (channelType == ChannelType.POSITION) {
            newMapping.ranges.push([0, 1]);
        } else if (channelType == ChannelType.ORIENTATION) {
            newMapping.ranges.push([-Math.PI, Math.PI]);
        } else if (channelType == ChannelType.SIZE) {
            let sizes = group.elements.map(e => DataUtil.getElementSize(e));
            newMapping.ranges.push([Math.min(...sizes), Math.max(...sizes)]);
            if (newMapping.ranges[0][0] == newMapping.ranges[0][1]) {
                newMapping.ranges[0][1]++;
            }
        } else { console.error("Invalid channel type", channelType); return; }
        group.mappings.push(newMapping);

        mModelController.addDimention(newDimention);
        mModelController.updateGroup(group);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
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

        let groups = elements.map(e => model.getGroupForElement(e.id));
        let groupCounts = groups.reduce((count, group) => {
            count[group.id] ? ++count[group.id] : count[group.id] = 1;
            return count;
        }, {});
        let topGroup = Object.entries(groupCounts).sort((a, b) => a[1] - b[1])[0];

        strokeIds.forEach(s => mModelController.removeStroke(s));
        ModelUtil.clearEmptyElements(mModelController);

        let group = mModelController.getModel().getGroup(topGroup[0]);
        group.elements.push(newElement);
        mModelController.updateGroup(group);

        ModelUtil.clearEmptyGroups(mModelController);

        mVersionController.stack(mModelController.getModel());
        mDashboardController.modelUpdate(mModelController.getModel());
    });

    mDashboardController.setAutoMergeElements((strokeIds) => {
        let elements = DataUtil.unique(strokeIds.map(s => mModelController.getModel().getElementForStroke(s)));
        ServerController.suggestGrouping(elements).then(grouping => {
            let elements = mModelController.getModel().getElements();

            // reconcile the algorithm results with the curdrent state. 
            let elementStrips = elements.map(element => {
                return {
                    id: element.id,
                    strips: DataUtil.unique(element.strokes
                        .map(s => grouping.findIndex(g => g.includes(s.id)))
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

            let mergeGroups = {};
            singletons.forEach(elementData => {
                if (!mergeGroups[elementData.strips[0]]) mergeGroups[elementData.strips[0]] = [];
                mergeGroups[elementData.strips[0]].push(elementData.id);
            });
            Object.values(mergeGroups).forEach(group => {
                if (group.length > 1) {
                    let groupElements = elements.filter(e => group.includes(e.id));
                    let oldestElement = groupElements.reduce((prev, cur) => (cur.creationTime < prev.creationTime) ? cur : prev);
                    ModelUtil.mergeElements(mModelController, groupElements.map(e => e.id).filter(id => id != oldestElement.id), oldestElement.id);
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
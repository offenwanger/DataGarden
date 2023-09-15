let ModelUtil = function () {
    function wrapStrokeInElement(stroke) {
        let boundingBox = DataUtil.getBoundingBox(stroke);
        stroke.path = PathUtil.translate(stroke.path, { x: -boundingBox.x, y: -boundingBox.y })

        let elem = new Data.Element();
        elem.x = boundingBox.x;
        elem.y = boundingBox.y;
        elem.strokes.push(stroke);
        return elem;
    }

    function getStupidSpine(element) {
        let points = element.strokes.map(s => s.path).flat();
        let yMax = points.reduce((prev, current) => (prev.y > current.y) ? prev : current);
        let yMix = points.reduce((prev, current) => (prev.y < current.y) ? prev : current);
        let xMax = points.reduce((prev, current) => (prev.x > current.x) ? prev : current);
        let xMin = points.reduce((prev, current) => (prev.x < current.x) ? prev : current);
        points = [yMax, yMix, xMax, xMin];
        let pairs = points.flatMap((v, i) => points.slice(i + 1).map(w => [v, w]));
        let dists = pairs.map(pair => MathUtil.length(MathUtil.subtract(pair[0], pair[1])));
        return pairs[dists.findIndex(i => i == Math.max(...dists))];
    }

    function getVemPosition(element, model) {
        let vemX = element.vemX;
        let vemY = element.vemY;
        if (!ValUtil.isNum(vemX) || !ValUtil.isNum(vemY)) {
            vemY = 10;
            vemX = 10;
        }

        if (element.parentId) {
            let parent = model.getElement(element.parentId);
            vemY = parent.vemY + 90;
            vemX = parent.vemX;
        }

        // it's dump and just parks it to the right.
        vemX = Math.max(vemX, ...model.getElements()
            .filter(e => e.id != element.id)
            .filter(e => e.vemY > vemY - 70 && e.vemY < vemY + 70)
            .map(e => e.vemX + 70));

        return { x: vemX, y: vemY };
    }

    function getStructPosition(item, model) {
        if (IdUtil.isType(item.id, Data.Group)) {
            let x = item.structX;
            let y = item.structY;
            let group = item;
            // if the struct position is not set, set it. 
            if (!ValUtil.isNum(x) || !ValUtil.isNum(y)) {
                if (group.parentId) {
                    let parent = model.getGroup(group.parentId);
                    y = parent.structY + 140;
                    x = parent.structX;
                } else {
                    y = 10;
                    x = 10;
                }
            }

            // it's dump and just parks it to the right.
            x = Math.max(x, ...model.getGroups()
                .filter(g => g.id != group.id)
                .filter(g => g.structY > y - 140 && g.structY < y + 140)
                .map(g => g.structX + 140));

            return { x, y }
        } else {
            let dimention = item;
            let boundingBox = {
                x: ValUtil.isNum(dimention.structX) ? dimention.structX : 10,
                y: ValUtil.isNum(dimention.structY) ? dimention.structY : 10,
                height: Size.ICON_LARGE * 0.25 + 10,
                width: Size.ICON_LARGE + 10
            };
            let boundingBoxes = model.getDimentions().map(d => {
                return {
                    x: d.structX,
                    y: d.structY,
                    height: Size.ICON_LARGE * 0.25,
                    width: Size.ICON_LARGE
                };
            }).concat(model.getGroups().map(g => {
                return {
                    x: g.structX,
                    y: g.structY,
                    height: Size.ICON_LARGE,
                    width: Size.ICON_LARGE
                };
            }))

            return DataUtil.findEmptyPlace(boundingBox, boundingBoxes);
        }
    }

    function updateParent(parentElementId, elementId, modelController) {
        if (parentElementId == elementId) { console.error("Can't parent a node to itself! " + parentElementId); return; }
        let model = modelController.getModel();
        let element = model.getElement(elementId);
        if (DataUtil.isDecendant(elementId, parentElementId, model)) {
            updateParent(element.parentId, parentElementId, modelController);
            model = modelController.getModel();
        }
        element.parentId = parentElementId;
        let vemPos = ModelUtil.getVemPosition(element, model);
        element.vemX = vemPos.x;
        element.vemY = vemPos.y;

        //TODO improve the efficiency here.
        function updateGroup(element, modelController) {
            let model = modelController.getModel();
            let group = ModelUtil.getValidGroup(element, model);
            if (!group) {
                group = new Data.Group();
                group.parentId = element.parentId ? model.getGroupForElement(element.parentId).id : null;
                let structPos = ModelUtil.getStructPosition(group, model)
                group.structX = structPos.x;
                group.structY = structPos.y;
                modelController.addGroup(group);
            }
            modelController.removeElement(element.id);
            modelController.addElement(group.id, element);
            let children = model.getElementChildren(element.id);
            children.forEach(child => {
                updateGroup(child, modelController);
            });
        }

        updateGroup(element, modelController);
    }

    function getValidGroup(element, model) {
        let groups;
        if (!element.parentId) {
            groups = model.getGroups().filter(g => !g.parentId);
        } else {
            let parentGroup = model.getGroupForElement(element.parentId);
            groups = model.getGroups().filter(g => g.parentId == parentGroup.id);
        }
        if (groups.length == 0) {
            return null;
        } else {
            // this should actually see which group is most appropriate or if it should make a new group
            return groups[0];
        }
    }

    function mergeStrokes(mergeTarget, mergeElement) {
        let strokes = DataUtil.getStrokesInLocalCoords(mergeTarget)
            .concat(DataUtil.getStrokesInLocalCoords(mergeElement))

        let bb = DataUtil.getBoundingBox(strokes);

        // update the target data and strokes
        mergeTarget.x = bb.x;
        mergeTarget.y = bb.y;
        strokes.forEach(stroke => {
            stroke.path = PathUtil.translate(stroke.path, { x: -bb.x, y: -bb.y })
        })
        mergeTarget.strokes = strokes;

        return mergeTarget;
    }

    function updateDimentionValues(mappingId, modelController) {
        // TODO: Finish this function
        let model = modelController.getModel();
        let mapping = model.getMapping(mappingId);
        let channelType = mapping.channel;
        let dimention = model.getDimention(mapping.dimentionId);
        let group = model.getGroup(mapping.groupId);
        if (channelType == ChannelTypes.NUMBER) {
            if (dimention.type == DimentionTypes.CATEGORICAL || dimention.type == DimentionTypes.ORDINAL) {
                group.elements.forEach((element, index) => {
                    let level = dimention.levels[index];
                    if (!level) {
                        level = new Data.Level();
                        level.name = "Level" + (index + 1);
                        modelController.addLevel(mapping.dimentionId, level);
                    }
                    let link = new Data.Link();
                    link.elementId = element.id;
                    link.levelId = level.id;
                    mapping.links.push(link);
                    modelController.updateMapping(mapping);
                });
            } else if (dimention.type == DimentionTypes.CONTINUOUS) {
                group.elements.forEach((element, index) => {
                    let link = new Data.Link();
                    link.elementId = element.id;
                    link.rangePercent = index * 1 / group.elements.length;
                    mapping.links.push(link);
                    modelController.updateMapping(mapping);
                });
            }
        } else if (channelType == ChannelTypes.FORM) {
            if (group.forms.length == 0) {
                formBucket(groupId, modelController);
                model = modelController.getModel();
                group = modelController.getGroup(groupId);
            }

            if (dimention.type == DimentionTypes.CATEGORICAL || dimention.type == DimentionTypes.ORDINAL) {
                group.forms.forEach((form, index) => {
                    let level = dimention.levels[index];
                    if (!level) {
                        level = new Data.Level();
                        level.name = "Level" + (index + 1);
                        modelController.addLevel(mapping.dimentionId, level);
                    }

                    let link = new Data.Link();
                    link.formId = form.id;
                    link.levelId = level.id;
                    newMapping.links.push(link);
                });
            } else if (dimention.type == DimentionTypes.CONTINUOUS) {
                group.forms.forEach((form, index) => {
                    let link = new Data.Link();
                    link.formId = form.id;
                    link.rangePercent = index * 1 / group.forms.length;
                    newMapping.links.push(link);
                });
            }
        } else if (channelType == ChannelTypes.ORIENTATION || channelType == ChannelTypes.POSITION) {
            console.error("Need to ensure element has a spine and the elements are mapped to it")
            if (dimention.type == DimentionTypes.CATEGORICAL || dimention.type == DimentionTypes.ORDINAL) {
                let buckets;
                if (dimention.levels.length == 0 && channelType == ChannelTypes.ORIENTATION) {
                    buckets = orientationBucketFairy(group, 0, modelController);
                } else if (dimention.levels.length == 0 && channelType == ChannelTypes.POSITION) {
                    buckets = positionBucketFairy(group, 0, modelController);
                } else if (channelType == ChannelTypes.ORIENTATION) {
                    buckets = orientationBucketFairy(group, dimention.levels.length, modelController);
                } else if (channelType == ChannelTypes.POSITION) {
                    buckets = positionBucketFairy(group, dimention.levels.length, modelController);
                }

                buckets.forEach(bucket => {
                    let level = new Data.Level();
                    level.name = "Level" + bucket.mix + "-" + bucket.max;
                    modelController.addLevel(dimentionId, level);

                    let link = new Data.Link();
                    link.levelId = level.id;
                    link.channelMin = bucket.min;
                    link.channelMax = bucket.max;
                    newMapping.links.push(link);
                })
            } else if (dimention.type == DimentionTypes.CONTINUOUS) {
                // nothing further needs doing, all elements have a 1-1 mapping with no abiguity. 
            }
        }
    }

    function formBucket(groupId, modelController) {
        // Group the group's elements into forms. 
        let group = modelController.getModel().getGroup(groupId);
        let form = new Data.Form();
        form.elementIds = group.elements.map(i => i.id);
        modelController.addForm(groupId, form);
    }

    function getMapping(groupId, dimentionId, channelType) {
        let mapping = new Data.Mapping();
        mapping.groupId = groupId;
        mapping.dimentionId = dimentionId;
        mapping.channel = channelType;
        return mapping;
    }

    function clearEmptyGroups(modelController) {
        let groups = modelController.getModel().getGroups();
        let removeGroupIds = groups.filter(g => g.elements.length == 0).map(g => g.id);
        removeGroupIds.forEach(id => modelController.removeGroup(id));
        groups.filter(g => removeGroupIds.includes(g.parentId) && !removeGroupIds.includes(g.id)).forEach(g => {
            g.parentId = null;
            modelController.updateGroup(g);
        });
    }

    return {
        wrapStrokeInElement,
        getStupidSpine,
        getVemPosition,
        getStructPosition,
        updateParent,
        getValidGroup,
        mergeStrokes,
        getMapping,
        updateDimentionValues,
        clearEmptyGroups,
    }
}();
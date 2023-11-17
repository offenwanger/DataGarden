let ModelUtil = function () {
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

    function updateParent(parentElementId, elementId, modelController) {
        if (parentElementId == elementId) { console.error("Can't parent a node to itself! " + parentElementId); return; }
        let model = modelController.getModel();
        let element = model.getElement(elementId);
        if (DataUtil.isDecendant(elementId, parentElementId, model)) {
            updateParent(element.parentId, parentElementId, modelController);
            model = modelController.getModel();
        }
        element.parentId = parentElementId;

        //TODO improve the efficiency here.
        function updateGroup(element, modelController) {
            let model = modelController.getModel();
            let group = ModelUtil.getValidGroup(element, model);
            if (!group) {
                group = new Data.Group();
                group.parentId = element.parentId ? model.getGroupForElement(element.parentId).id : null;
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

    function mergeElements(modelController, elements, target) {
        elements.forEach(elementId => {
            let element = modelController.getModel().getElement(elementId);
            let children = modelController.getModel().getElementChildren(elementId);
            children.forEach(child => {
                if (child.id == target) {
                    ModelUtil.updateParent(element.parentId, target, modelController);
                } else {
                    ModelUtil.updateParent(target, child.id, modelController);
                }
            })
            // handle an edge case where the merge element is a grandchild of this element
            // it might have been set to this element when updating this elements children
            if (modelController.getModel().getElementChildren(elementId).length == 1) {
                ModelUtil.updateParent(element.parentId, target, modelController);
            }
            let mergeElement = modelController.getModel().getElement(target);
            mergeElement.strokes = mergeElement.strokes.concat(element.strokes);
            modelController.removeElement(elementId);
            modelController.updateElement(mergeElement);
        });
        ModelUtil.clearEmptyGroups(modelController);
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
        } else if (channelType == ChannelTypes.ANGLE || channelType == ChannelTypes.POSITION) {
            console.error("Need to ensure element has a spine and the elements are mapped to it")
            if (dimention.type == DimentionTypes.CATEGORICAL || dimention.type == DimentionTypes.ORDINAL) {
                let buckets;
                if (dimention.levels.length == 0 && channelType == ChannelTypes.ANGLE) {
                    buckets = angleBucketFairy(group, 0, modelController);
                } else if (dimention.levels.length == 0 && channelType == ChannelTypes.POSITION) {
                    buckets = positionBucketFairy(group, 0, modelController);
                } else if (channelType == ChannelTypes.ANGLE) {
                    buckets = angleBucketFairy(group, dimention.levels.length, modelController);
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

    function clearEmptyElements(modelController) {
        let elements = modelController.getModel().getElements();
        let removeElementIds = elements.filter(e => e.strokes.length == 0).map(e => e.id);
        removeElementIds.forEach(id => modelController.removeElement(id));
        elements.filter(e => removeElementIds.includes(e.parentId) && !removeElementIds.includes(e.id)).forEach(e => {
            e.parentId = null;
            modelController.updateElement(e);
        });
    }

    return {
        getStupidSpine,
        updateParent,
        getValidGroup,
        getMapping,
        mergeElements,
        updateDimentionValues,
        clearEmptyGroups,
        clearEmptyElements,
    }
}();
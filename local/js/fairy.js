let Fairies = function () {
    function strokeFairy(stroke, modelController) {
        // Make a decision about how to update the model for a new stroke. 
        // Right now these fairies only handle new elements, but they'll need to handle changes to. 

        // Right now just make the dumb decision to create a new element every time.
        let boundingBox = DataUtil.getBoundingBox(stroke);
        stroke.path = PathUtil.translate(stroke.path, { x: -boundingBox.x, y: -boundingBox.y })

        let elem = new Data.Element();
        elem.x = boundingBox.x;
        elem.y = boundingBox.y;
        elem.strokes.push(stroke);
        spineFairy(elem);

        newElementFairy(elem, modelController);
    }

    function newElementFairy(elem, modelController) {
        // this Fairies is responsible for setting new element values
        let model = modelController.getModel();

        elementVemPositionFairy(elem, model);

        let group = model.getGroups().find(g => g.elements.some(e => e.parentId == elem.parentId));
        if (!group) {
            group = new Data.Group();
            group.elements.push(elem);
            newGroupFairy(group, modelController);
        } else {
            modelController.addElement(group.id, elem);
        }
    }

    function elementVemPositionFairy(element, model) {
        // if the num is not set, set it. 
        if (!ValUtil.isNum(element.vemX) || !ValUtil.isNum(element.vemY)) {
            if (element.parentId) {
                let parent = model.getElement(element.parentId);
                element.vemY = parent.vemY + 90;
                element.vemX = parent.vemX;
            } else {
                element.vemY = 10;
                element.vemX = 10;
            }
        }

        // it's dump and just parks it to the right.
        element.vemX = Math.max(element.vemX, ...model.getElements()
            .filter(e => e.id != element.id)
            .filter(e => e.vemY > element.vemY - 70 && e.vemY < element.vemY + 70)
            .map(e => e.vemX + 70));
    }

    function newGroupFairy(group, modelController) {
        // this fairy is responsible for setting values on new groups.
        groupStructPositionFairy(group, modelController.getModel())
        modelController.addGroup(group);
    }

    function groupStructPositionFairy(group, model) {
        // if the struct position is not set, set it. 
        if (!ValUtil.isNum(group.structX) || !ValUtil.isNum(group.structY)) {
            if (group.parentId) {
                let parent = model.getGroup(group.parentId);
                group.structY = parent.structY + 140;
                group.structX = parent.structX;
            } else {
                group.structY = 10;
                group.structX = 10;
            }
        }

        // it's dump and just parks it to the right.
        group.structX = Math.max(group.structX, ...model.getGroups()
            .filter(g => g.id != group.id)
            .filter(g => g.structY > group.structY - 140 && g.structY < group.structY + 140)
            .map(g => g.structX + 140));
    }

    function dimentionStructPositionFairy(dimention, model) {
        // if the struct position is not set, set it. 
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

        let coords = DataUtil.findEmptyPlace(boundingBox, boundingBoxes);
        dimention.structX = coords.x;
        dimention.structY = coords.y;
    }

    function elementMergeFairy(elementIds, mergeTargetId, modelController) {
        let model = modelController.getModel();
        let strokes = model.getStrokesInLocalCoords(elementIds.concat([mergeTargetId]));
        let bb = DataUtil.getBoundingBox(strokes);
        let mergeTarget = model.getElement(mergeTargetId);
        let children = elementIds
            .map(elementId => model.getElementChildren(elementId))
            .flat()
            .filter(d => !elementIds.includes(d.id));
        // this is used later for group correction
        let decendants = DataUtil.unique(elementIds
            .map(elementId => model.getElementDecendants(elementId))
            .flat()
            .filter(e => !elementIds.includes(e.id)));

        // update the target data and strokes
        mergeTarget.x = bb.x;
        mergeTarget.y = bb.y;
        strokes.forEach(stroke => {
            stroke.path = PathUtil.translate(stroke.path, { x: -bb.x, y: -bb.y })
        })
        mergeTarget.strokes = strokes;
        spineFairy(mergeTarget);

        modelController.updateElement(mergeTarget);

        // remove the merged elements
        elementIds.forEach(elementId => {
            modelController.removeElement(elementId);
        });

        // update the merged elements childrens parent pointers
        children.forEach(element => {
            if (elementIds.includes(element.parentId)) {
                element.parentId = mergeTargetId;
                modelController.updateElement(element);
            }
        });

        groupCorrectionFairy(decendants, modelController)
    }

    function elementParentFairy(elementIds, parentTargetId, modelController) {
        let model = modelController.getModel();
        let elements = model.getElements().filter(e => elementIds.includes(e.id));
        let decendants = DataUtil.unique(elementIds.map(elementId => model.getElementDecendants(elementId)).flat());

        let skips = [];
        elements.forEach(element => {
            // first add a skip for loops
            let curr = parentTargetId;
            // this is for a check to prevent infinite loops
            let touchedIds = [];
            while (curr != null) {
                let currElement = model.getElement(curr);
                if (!currElement) (console.error("invalid state, parent element not found", curr))
                if (currElement.parentId == element.id) {
                    // Loop found. 
                    // This can only happen when a parent element is parented lower in the tree, we therefore
                    // don't need to worry about additional elements being affected. 
                    currElement.parentId = element.parentId;
                    currElement.vemX = null;
                    currElement.vemY = null;
                    elementVemPositionFairy(currElement, model);
                    skips.push(currElement);
                    break;
                } else {
                    curr = currElement.parentId;
                    if (touchedIds.includes(curr)) { console.error("Bad state, loop in parenting"); break; }
                    touchedIds.push(curr);
                }
            }

            // then update the element data
            element.parentId = parentTargetId;
            element.vemX = null;
            element.vemY = null;
            elementVemPositionFairy(element, model);
        });

        elements.concat(skips).forEach(e => modelController.updateElement(e));

        groupCorrectionFairy(decendants, modelController)
    }

    function groupCorrectionFairy(affectedElements, modelController) {
        // sort the elements by their level and do them top to bottom
        let levels = [];
        let model = modelController.getModel();
        affectedElements.forEach(element => {
            let level = DataUtil.getElementLevel(element, model);
            if (!levels[level]) levels[level] = [];
            levels[level].push(element);
        })
        levels.forEach((elements, index) => elements.forEach(element => {
            let model = modelController.getModel();
            if (!ValUtil.isGroupValid(element, modelController.getModel())) {
                let group;
                if (!element.parentId) {
                    group = model.getGroups().find(g => !g.parentId);
                    if (!group) {
                        group = new Data.Group();
                        newGroupFairy(group, modelController);
                    }
                } else {
                    let parentGroup = model.getGroups().find(g => g.elements.some(e => e.id == element.parentId));
                    if (!parentGroup) { console.error("Cannot find parent group invalid state", element); return; }

                    // first see if this elements parents has a group with unaffected children in it. 
                    group = model.getGroups().find(g => g.elements.filter(e => !affectedElements.some(ae => ae.id == e.id))
                        .some(e => e.parentId == element.parentId));
                    // if not, see if the parent's group has any child groups. 
                    if (!group) {
                        group = model.getGroups().find(g => g.parentId == parentGroup.id);
                    }
                    // if not, make a new group. 
                    if (!group) {
                        group = new Data.Group();
                        group.parentId = parentGroup.id;
                        newGroupFairy(group, modelController);
                    }
                }

                modelController.removeElement(element.id);
                modelController.addElement(group.id, element);
            };
        }))

        model = modelController.getModel();
        model.getGroups().forEach(group => {
            if (group.elements.length == 0) {
                modelController.removeGroup(group.id);
            }
        })
    }

    function newMappingFairy(groupId, dimentionId, channelType, modelController) {
        let model = modelController.getModel();
        let existingMapping = model.getMappings().find(m => m.groupId == groupId && m.channel == channelType);
        if (existingMapping) {
            if (existingMapping.dimentionId == dimentionId) {
                // already exists, nothing more to do here. 
                return;
            } else {
                modelController.removeMapping(existingMapping.id);
                model = modelController.getModel();
            }
        }
        existingMapping = model.getMappings().find(m => m.dimentionId == dimentionId);
        if (existingMapping) {
            modelController.removeMapping(existingMapping.id);
            model = modelController.getModel();
        }

        let newMapping = new Data.Mapping();
        newMapping.groupId = groupId;
        newMapping.dimentionId = dimentionId;
        newMapping.channel = channelType;

        let dimention = model.getDimention(dimentionId);
        let group = model.getGroup(groupId);
        if (channelType == ChannelTypes.NUMBER) {
            if (dimention.type == DimentionTypes.CATEGORICAL || dimention.type == DimentionTypes.ORDINAL) {
                group.elements.forEach((element, index) => {
                    let level = dimention.levels[index];
                    if (!level) {
                        level = new Data.Level();
                        level.name = "Level" + (index + 1);
                        modelController.addLevel(dimentionId, level);
                    }
                    let link = new Data.Link();
                    link.elementId = element.id;
                    link.levelId = level.id;
                    newMapping.links.push(link);
                });
            } else if (dimention.type == DimentionTypes.CONTINUOUS) {
                group.elements.forEach((element, index) => {
                    let link = new Data.Link();
                    link.elementId = element.id;
                    link.rangePercent = index * 1 / group.elements.length;
                    newMapping.links.push(link);
                });
            }
        } else if (channelType == ChannelTypes.FORM) {
            if (group.forms.length == 0) {
                formBucketFairy(groupId, modelController);
                model = modelController.getModel();
                group = modelController.getGroup(groupId);
            }

            if (dimention.type == DimentionTypes.CATEGORICAL || dimention.type == DimentionTypes.ORDINAL) {
                group.forms.forEach((form, index) => {
                    let level = dimention.levels[index];
                    if (!level) {
                        level = new Data.Level();
                        level.name = "Level" + (index + 1);
                        modelController.addLevel(dimentionId, level);
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

        modelController.addMapping(newMapping);
    }

    function formBucketFairy(groupId, modelController) {
        // Group the group's elements into forms. 
        let group = modelController.getModel().getGroup(groupId);
        let form = new Data.Form();
        form.elementIds = group.elements.map(i => i.id);
        modelController.addForm(groupId, form);
    }

    function spineFairy(element) {
        let xs = element.strokes.map(s => s.path.map(p => p.x)).flat();
        let ys = element.strokes.map(s => s.path.map(p => p.y)).flat();
        let localSpine = [{ x: Math.min(...xs), y: Math.min(...ys) }, { x: Math.max(...xs), y: Math.max(...ys) }];
        if (!element.spine) {
            element.spine = localSpine;
        }
        ServerRequestUtil.getSpine(element).then(result => {
            if (result) {
                // TODO: Rework Fairies to run async. 
                element.spine = result;
            }
        }).catch(e => {
            console.error("Error, could not get spine.", e)
        })
    }

    return {
        strokeFairy,
        elementMergeFairy,
        elementParentFairy,
        dimentionStructPositionFairy,
        newMappingFairy,
        spineFairy,
    }
}();
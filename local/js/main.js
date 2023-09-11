document.addEventListener('DOMContentLoaded', function (e) {
    let mModelController = new ModelController();

    let mStrokeViewController = new StrokeViewController();
    let mVemViewController = new VemViewController();
    let mStructViewController = new StructViewController();
    let mTableViewController = new TableViewController();

    mStrokeViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);
    mVemViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);
    mStructViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);
    mTableViewController.onResize(window.innerWidth * 0.5, window.innerHeight * 0.5);

    let mEventManager = new EventManager(mStrokeViewController, mVemViewController, mStructViewController, mTableViewController);

    mStrokeViewController.setNewStrokeCallback((stroke) => {
        let model = mModelController.getModel();

        let element = ModelUtil.wrapStrokeInElement(stroke);
        element.spine = ModelUtil.getStupidSpine(element);
        let vemPos = ModelUtil.getVemPosition(element, model);
        element.vemX = vemPos.x;
        element.vemY = vemPos.y;

        let group;
        if (model.getGroups().length == 0) {
            group = new Data.Group();
            group.elements.push(element);
            let structPos = ModelUtil.getStructPosition(group, model)
            group.structX = structPos.x;
            group.structY = structPos.y;
            mModelController.addGroup(group);
        } else {
            mModelController.addElement(model.getGroups().find(g => !g.parentId).id, element);
        }

        modelUpdate();

        ServerRequestUtil.getSpine(element).then(result => {
            if (result) {
                element = mModelController.getModel().getElement(element.id);
                element.spine = result;
                mModelController.updateElement(element);
            }
        })
    })

    mStrokeViewController.setHighlightCallback((selection) => {
        mVemViewController.highlight(selection);
        mStructViewController.highlight(selection);
    })

    mStrokeViewController.setSelectionCallback((selection) => {
        // selection could be strokes or elements
        // might select an entire element tree
        // update the Vem and Struct selections
    })

    mVemViewController.setMoveElementCallback((selection, translation) => {
        let elements = mModelController.getModel().getElements().filter(e => selection.includes(e.id))
        elements.forEach(element => {
            element.vemX = element.vemX + translation.x;
            element.vemY = element.vemY + translation.y;
            mModelController.updateElement(element);
        })
        modelUpdate();
    })

    mVemViewController.setMergeElementCallback((selection, mergeElementId) => {
        selection.forEach(elementId => {
            let element = mModelController.getModel().getElement(elementId);
            let children = mModelController.getModel().getElementChildren(elementId);
            children.forEach(child => {
                if (child.id == mergeElementId) {
                    ModelUtil.updateParent(element.parentId, mergeElementId, mModelController);
                } else {
                    ModelUtil.updateParent(mergeElementId, child.id, mModelController);
                }
            })
            // handle an edge case where the merge element is a grandchild of this element
            // it might have been set to this element when updating this elements children
            if (mModelController.getModel().getElementChildren(elementId).length == 1) {
                ModelUtil.updateParent(element.parentId, mergeElementId, mModelController);
            }
            let mergeElement = mModelController.getModel().getElement(mergeElementId);
            mergeElement = ModelUtil.mergeStrokes(mergeElement, element);
            mModelController.removeElement(elementId);
            mModelController.updateElement(mergeElement);
        });
        ModelUtil.clearEmptyGroups(mModelController);
        modelUpdate();
    })

    mVemViewController.setParentElementCallback((selection, parentElementId) => {
        selection.forEach(elementId => {
            ModelUtil.updateParent(parentElementId, elementId, mModelController)
        });
        ModelUtil.clearEmptyGroups(mModelController);
        modelUpdate();
    })


    mVemViewController.setSelectionCallback((selection) => {
        // selections could be strokes or elements. 
        // Update the stroke and Struct selections
    })

    mVemViewController.setHighlightCallback((selection) => {
        mStrokeViewController.highlight(selection);
        mStructViewController.highlight(selection);
    })


    mStructViewController.setSelectionCallback((selection) => {
        // selectsions could be groups or elements. Update the 
        // Vem and Stroke selections
    })

    mStructViewController.setHighlightCallback((selection) => {
        mStrokeViewController.highlight(selection);
        mVemViewController.highlight(selection);
    })

    mStructViewController.setDimentionCreationCallback((coords) => {
        let dimention = new Data.Dimention();
        dimention.structX = coords.x;
        dimention.structY = coords.y;
        let structPos = ModelUtil.getStructPosition(dimention, mModelController.getModel())
        dimention.structX = structPos.x;
        dimention.structY = structPos.y;
        mModelController.addDimention(dimention);
        modelUpdate();
    })

    mStructViewController.setMoveObjectsCallback((objects, translation) => {
        let model = mModelController.getModel();
        objects.filter(i => IdUtil.isType(i, Data.Dimention))
            .forEach(dimentionId => {
                let dimention = model.getDimention(dimentionId);
                dimention.structX += translation.x;
                dimention.structY += translation.y;
                mModelController.updateDimention(dimention);
            })
        objects.filter(i => IdUtil.isType(i, Data.Group))
            .forEach(groupId => {
                let group = model.getGroup(groupId);
                group.structX += translation.x;
                group.structY += translation.y;
                mModelController.updateGroup(group);
            })
        modelUpdate();
    })

    mStructViewController.setLinkCallback((groupId, dimentionId, channelType) => {
        // first remove the mapping if it exists. 
        let existingMapping = mModelController.getModel().getMappings()
            .find(m => m.groupId == groupId && m.channel == channelType);
        if (existingMapping) {
            if (existingMapping.dimentionId == dimentionId) {
                // already exists, nothing more to do here. 
                return;
            } else {
                mModelController.removeMapping(existingMapping.id);
            }
        }
        existingMapping = mModelController.getModel().getMappings()
            .find(m => m.dimentionId == dimentionId);
        if (existingMapping) {
            mModelController.removeMapping(existingMapping.id);
        }

        let newMapping = ModelUtil.getMapping(groupId, dimentionId, channelType);
        mModelController.addMapping(newMapping);
        ModelUtil.updateDimentionValues(newMapping.id, mModelController);
        modelUpdate();
    })




    function modelUpdate() {
        let model = mModelController.getModel();
        mStrokeViewController.onModelUpdate(model);
        mVemViewController.onModelUpdate(model);
        mStructViewController.onModelUpdate(model);
        mTableViewController.onModelUpdate(model);
    }
});
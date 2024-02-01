import { NO_CATEGORY_ID } from "../constants.js";
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

    return {
        updateParent,
        clearEmptyElements,
        removeElement,
        autoClusterLevelDimensions,
        orientSpine,
        orientSpineToParent,
        orientElementByParent,
    }
}();
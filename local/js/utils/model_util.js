import { Data } from "../data_structs.js";
import { DataUtil } from "./data_util.js";
import { IdUtil } from "./id_util.js";
import { PathUtil } from "./path_util.js";
import { StructureFairy } from "./structure_fairy.js";

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

        if (parentElement) {
            let closestPosition = PathUtil.getClosestPointOnPath(element.root, parentElement.spine);
            element.position = closestPosition.percent;
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
        model.getLevels().forEach(level => {
            if (level.elementIds.includes(elementId)) {
                level.elementIds = level.elementIds.filter(id => id != elementId);
                modelController.updateLevel(level);
            }
        })
        modelController.removeElement(elementId);
    }

    function autoClusterTierDimensions(tier, modelController) {
        let model = modelController.getModel();
        model.getDimensions().filter(d => d.tier == tier).forEach(dimen => {
            // TODO: Fix issue with classifying element that aren't meant to be 
            // classified
            let levels = StructureFairy.getCluster(dimen.id, model);
            if (levels) {
                dimen.levels = levels;
                modelController.updateDimension(dimen);
            }
        });
    }

    return {
        updateParent,
        clearEmptyElements,
        removeElement,
        autoClusterTierDimensions,
    }
}();
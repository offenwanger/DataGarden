
function FdlViewController() {
    const ZOOMING = 'zooming'
    const PANNING = 'panning';
    const SELECTION = 'selection';

    let mCodeUtil = new CodeUtil();

    let mHighlightCallback = () => { };
    let mParentUpdateCallback = () => { };
    let mMergeElementCallback = () => { };
    let mNewElementCallback = () => { }
    let mMoveElementCallback = () => { }
    let mMoveStrokeCallback = () => { }
    let mNewGroupCallback = () => { }
    let mContextMenuCallback = () => { }

    let mModel = new DataModel();
    let mSimulationData = [];
    let mInteraction = null;

    let mHighlightObjects = [];

    let mCanvas = d3.select('#fdl-view-container').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#fdl-view-container").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#fdl-view-container").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mColorMap = d3.scaleOrdinal(d3.schemeCategory10);

    let mDrawingUtil = new DrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d"),
        mInterfaceCanvas.node().getContext("2d"),
    );

    let mFdlParentViewController = new FdlParentViewController(mDrawingUtil, mCodeUtil, mColorMap);

    let mMode = FdlMode.PARENT;
    let mActiveViewController = mFdlParentViewController;

    function onModelUpdate(model) {
        mModel = model;

        mHighlightObjects = [];
        mHighlightLink = null

        updateSimulationData();
    }

    function updateSimulationData() {
        let oldSimulationData = mSimulationData;
        mSimulationData = [];

        mModel.getElements().forEach(element => {
            let nodeData = {
                id: element.id,
                parent: element.parentId,
                radius: Size.ELEMENT_NODE_SIZE,
                treeLevel: DataUtil.getTreeLevel(mModel, element.id),
            }
            let oldNodeData = oldSimulationData.find(item => item.id == element.id);
            if (!oldNodeData) {
                nodeData.x = 0;
                nodeData.y = 0;
            } else {
                nodeData.x = oldNodeData.x;
                nodeData.y = oldNodeData.y;
            }

            mSimulationData.push(nodeData);
        });

        mActiveViewController.updateSimulationData(mSimulationData, mModel);
    }

    function setMode(mode, dimenId = null) {
        mMode = mode;
        if (mode == FdlMode.PARENT) {
            mActiveViewController = mFdlParentViewController;
        } else if (mode == FdlMode.LEGEND) {
            console.error("set to legend controller")
        } else if (mode == FdlMode.DIMENTION) {
            console.error("set to dimention and set the id to", dimenId)
        }
        mActiveViewController.updateSimulationData(mSimulationData);
        console.error("draw or start or something the active view");
    }

    function onResize(width, height) {
        d3.select("#fdl-view-container")
            .style('width', width + "px")
            .style('height', height + "px");
        mCanvas
            .attr('width', width)
            .attr('height', height);
        mInterfaceCanvas
            .attr('width', width)
            .attr('height', height);
        mInteractionCanvas
            .attr('width', width)
            .attr('height', height);

        mFdlParentViewController.onResize(width, height);
    }

    function onPointerDown(screenCoords, toolState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
            console.error("Bad event state", screenCoords, toolState); return;
        };

        if (toolState == Buttons.PANNING_BUTTON) {
            mInteraction = {
                type: PANNING,
                start: screenCoords,
                startTransform: mActiveViewController.getTranslate(),
            }
        } else if (toolState == Buttons.ZOOM_BUTTON) {
            mInteraction = {
                type: ZOOMING,
                start: screenCoords,
                startTransform: mActiveViewController.getTranslate(),
                scale: mActiveViewController.getScale(),
            }
        } else if (toolState == Buttons.SELECTION_BUTTON) {
            let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            if (target) {
                let modelCoords = screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale());
                // TODO check for group selection here
                mInteraction = {
                    type: SELECTION,
                    start: modelCoords,
                    target: target.id,
                }

                mActiveViewController.interactionStart(mInteraction, modelCoords);
            } else {
                console.error("Do a lasoo");
            }
        }
    }

    function onDblClick(screenCoords, toolState) {

    }

    function onPointerMove(screenCoords, toolState) {
        if (mInteraction) {
            if (mInteraction.type == PANNING) {
                let mouseDist = MathUtil.subtract(screenCoords, mInteraction.start);
                let translate = MathUtil.add(mInteraction.startTransform, mouseDist);
                mActiveViewController.pan(translate.x, translate.y)
            } else if (mInteraction.type == ZOOMING) {
                let mouseDist = screenCoords.y - mInteraction.start.y;
                let scale = mInteraction.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
                let zoomChange = scale - mInteraction.scale;
                let transformX = -(mInteraction.start.x * zoomChange) + mInteraction.startTransform.x;
                let transformY = -(mInteraction.start.x * zoomChange) + mInteraction.startTransform.y;
                mActiveViewController.zoom(transformX, transformY, scale);
            } else if (mInteraction.type == SELECTION) {
                let modelCoords = screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale());
                mActiveViewController.interactionDrag(mInteraction, modelCoords);
            } else {
                console.error("Unimplimented!")
            }
        } else {
            let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            if (target) {
                console.error("highlight probably")
            }
        }
    }

    function onPointerUp(screenCoords, toolState) {
        let interaction = mInteraction;
        mInteraction = null;

        if (interaction && interaction.type == SELECTION) {
            interaction.endTarget = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            if (interaction.endTarget) interaction.endTarget = interaction.endTarget.id;
            let modelCoords = screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale());
            mActiveViewController.interactionEnd(interaction, modelCoords);
        }
    }

    function highlight(selection) {
        mActiveViewController.highlight(selection);
    }

    function screenToModelCoords(screenCoords, translate, scale) {
        let boundingBox = mInterfaceCanvas.node().getBoundingClientRect();
        if (ValUtil.checkConvertionState(screenCoords, boundingBox, { x: translate.x, y: translate.y, k: scale })) {
            return {
                x: (screenCoords.x - boundingBox.x - translate.x) / scale,
                y: (screenCoords.y - boundingBox.y - translate.y) / scale
            };
        } else {
            return { x: 0, y: 0 };
        }
    }

    return {
        onModelUpdate,
        setMode,
        onPointerDown,
        onDblClick,
        onPointerMove,
        onPointerUp,
        onResize,
        highlight,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setParentUpdateCallback: (func) => mFdlParentViewController.setParentUpdateCallback(func),
        setMergeElementCallback: (func) => mMergeElementCallback = func,
        setNewElementCallback: (func) => mNewElementCallback = func,
        setMoveElementCallback: (func) => mMoveElementCallback = func,
        setMoveStrokeCallback: (func) => mMoveStrokeCallback = func,
        setNewGroupCallback: (func) => mNewGroupCallback = func,
        setContextMenuCallback: (func) => mContextMenuCallback = func,
    }
}


function FdlViewController() {
    const ZOOMING = 'zooming'
    const PANNING = 'panning';
    const SELECTION = 'selection';

    let mCodeUtil = new CodeUtil();

    let mHighlightCallback = () => { };
    let mMergeElementCallback = () => { };
    let mNewElementCallback = () => { }
    let mMoveElementCallback = () => { }
    let mMoveStrokeCallback = () => { }
    let mContextMenuCallback = () => { }
    let mEditNameCallback = () => { };
    let mEditTypeCallback = () => { };
    let mEditChannelCallback = () => { };
    let mEditTierCallback = () => { };

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
    let mFdlLegendViewController = new FdlLegendViewController(mDrawingUtil, mCodeUtil);
    let mFdlDimentionViewController = new FdlDimentionViewController(mDrawingUtil, mCodeUtil, mColorMap);

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

        mModel.getDimentions().forEach(dimention => {
            let dimentionData = {
                id: dimention.id,
                name: dimention.name,
                type: dimention.type,
                channel: dimention.channel,
                tier: dimention.tier,
            }
            let oldData = oldSimulationData.find(item => item.id == dimention.id);
            if (!oldData) {
                dimentionData.x = 0;
                dimentionData.y = 0;
            } else {
                dimentionData.x = oldData.x;
                dimentionData.y = oldData.y;
            }

            mSimulationData.push(dimentionData);

            if (dimention.type == DimentionType.DISCRETE) {
                dimention.levels.forEach(level => {
                    let levelData = {
                        id: level.id,
                        name: level.name,
                        dimention: dimention.id,
                    }
                    let oldData = oldSimulationData.find(item => item.id == level.id);
                    if (oldData) {
                        levelData.x = oldData.x;
                        levelData.y = oldData.y;
                    } else {
                        levelData.x = 0;
                        levelData.y = 0;
                    }
                    mSimulationData.push(levelData);
                })
            } else {
                let minData = {
                    id: DimentionValueId.MIN,
                    name: dimention.domain[0],
                    dimention: dimention.id,
                };
                let oldMinData = oldSimulationData.find(item => item.dimention == dimention.id && item.id == DimentionValueId.MIN);
                if (oldMinData) {
                    minData.x = oldMinData.x;
                    minData.y = oldMinData.y;
                } else {
                    minData.x = 0;
                    minData.y = 0;
                }
                let maxData = {
                    id: DimentionValueId.MAX,
                    name: dimention.domain[1],
                    dimention: dimention.id,
                };
                let oldMaxData = oldSimulationData.find(item => item.dimention == dimention.id && item.id == DimentionValueId.MAX);
                if (oldMaxData) {
                    maxData.x = oldMaxData.x;
                    maxData.y = oldMaxData.y;
                } else {
                    maxData.x = 0;
                    maxData.y = 0;
                }
                mSimulationData.push(minData, maxData);
            }
        });

        mActiveViewController.updateSimulationData(mSimulationData, mModel);
    }

    function setMode(mode, dimenId = null) {
        mActiveViewController.stop();
        let oldActiveViewController = mActiveViewController;
        if (mode == FdlMode.PARENT) {
            mActiveViewController = mFdlParentViewController;
        } else if (mode == FdlMode.LEGEND) {
            mActiveViewController = mFdlLegendViewController;
        } else if (mode == FdlMode.DIMENTION) {
            mActiveViewController = mFdlDimentionViewController;
            mFdlDimentionViewController.setDimention(dimenId);
        }

        convertCoordinateSystem(mSimulationData, oldActiveViewController, mActiveViewController);

        mActiveViewController.updateSimulationData(mSimulationData, mModel);
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
                // TODO check for multi-item selection here
                mInteraction = {
                    type: SELECTION,
                    start: modelCoords,
                    target,
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
                mActiveViewController.highlight(target.id ? target.id : target);
            } else {
                mActiveViewController.highlight(null);
            }
        }
    }

    function onPointerUp(screenCoords, toolState) {
        let interaction = mInteraction;
        mInteraction = null;

        if (interaction && interaction.type == SELECTION) {
            interaction.endTarget = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            if (interaction.endTarget && interaction.endTarget.id) interaction.endTarget = interaction.endTarget.id;
            let modelCoords = screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale());
            mActiveViewController.interactionEnd(interaction, modelCoords);
        }
    }

    function highlight(selection) {
        mActiveViewController.highlight(selection);
    }

    mFdlDimentionViewController.setEditNameCallback((itemId, x, y, width, height) => {
        let bb = modelBoundingBoxToScreenBoundingBox(
            { x, y, height, width },
            mActiveViewController.getTranslate(),
            mActiveViewController.getScale())

        mEditNameCallback(itemId, bb.x, bb.y, bb.width, bb.height);
    })

    mFdlDimentionViewController.setEditTypeCallback((dimentionId, x, y, width, height) => {
        let bb = modelBoundingBoxToScreenBoundingBox(
            { x, y, height, width },
            mActiveViewController.getTranslate(),
            mActiveViewController.getScale())

        mEditTypeCallback(dimentionId, bb.x, bb.y, bb.width, bb.height);
    })

    mFdlDimentionViewController.setEditChannelCallback((dimentionId, x, y, width, height) => {
        let bb = modelBoundingBoxToScreenBoundingBox(
            { x, y, height, width },
            mActiveViewController.getTranslate(),
            mActiveViewController.getScale())

        mEditChannelCallback(dimentionId, bb.x, bb.y, bb.width, bb.height);
    })

    mFdlDimentionViewController.setEditTierCallback((dimentionId, x, y, width, height) => {
        let bb = modelBoundingBoxToScreenBoundingBox(
            { x, y, height, width },
            mActiveViewController.getTranslate(),
            mActiveViewController.getScale())

        mEditTierCallback(dimentionId, bb.x, bb.y, bb.width, bb.height);
    })

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

    function modelToScreenCoords(modelCoords, translate, scale) {
        let boundingBox = mInterfaceCanvas.node().getBoundingClientRect();
        return {
            x: modelCoords.x * scale + boundingBox.x + translate.x,
            y: modelCoords.y * scale + boundingBox.y + translate.y
        };
    }

    function modelBoundingBoxToScreenBoundingBox(boundingBox, translate, scale) {
        let screenCoords = modelToScreenCoords({
            x: boundingBox.x,
            y: boundingBox.y
        }, translate, scale);
        let screenCoords2 = modelToScreenCoords({
            x: boundingBox.x + boundingBox.width,
            y: boundingBox.y + boundingBox.height
        }, translate, scale);

        return {
            x: screenCoords.x,
            y: screenCoords.y,
            width: screenCoords2.x - screenCoords.x,
            height: screenCoords2.y - screenCoords.y
        }
    }

    function convertCoordinateSystem(data, fromController, toController) {
        let fromTranslate = fromController.getTranslate();
        let toTranslate = toController.getTranslate();
        let fromScale = fromController.getScale();
        let toScale = toController.getScale();

        data.forEach(item => {
            item.x = ((item.x * fromScale) + fromTranslate.x - toTranslate.x) / toScale;
            item.y = ((item.y * fromScale) + fromTranslate.y - toTranslate.y) / toScale;
        })
    }

    function hide() {
        d3.select('#fdl-view-container').style("display", "none");
    }

    function show() {
        d3.select('#fdl-view-container').style("display", "");
    }

    //////////// Useful TESTING FUNCTION ////////////
    // d3.select(document).on('wheel', function (e) {
    //     if (e.deltaY > 0) mActiveViewController.stop();
    //     if (e.deltaY < 0) updateSimulationData();
    // })


    return {
        onModelUpdate,
        setMode,
        onPointerDown,
        onDblClick,
        onPointerMove,
        onPointerUp,
        onResize,
        highlight,
        hide,
        show,
        setHighlightCallback: (func) => mHighlightCallback = func,
        setParentUpdateCallback: (func) => mFdlParentViewController.setParentUpdateCallback(func),
        setAddDimentionCallback: (func) => mFdlLegendViewController.setAddDimentionCallback(func),
        setClickDimentionCallback: (func) => mFdlLegendViewController.setClickDimentionCallback(func),
        setAddLevelCallback: (func) => mFdlDimentionViewController.setAddLevelCallback(func),
        setUpdateLevelCallback: (func) => mFdlDimentionViewController.setUpdateLevelCallback(func),
        setEditNameCallback: (func) => mEditNameCallback = func,
        setEditTypeCallback: (func) => mEditTypeCallback = func,
        setEditChannelCallback: (func) => mEditChannelCallback = func,
        setEditTierCallback: (func) => mEditTierCallback = func,
        setMergeElementCallback: (func) => mMergeElementCallback = func,
        setNewElementCallback: (func) => mNewElementCallback = func,
        setMoveElementCallback: (func) => mMoveElementCallback = func,
        setContextMenuCallback: (func) => mContextMenuCallback = func,
    }
}

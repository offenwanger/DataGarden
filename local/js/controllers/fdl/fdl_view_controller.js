
function FdlViewController() {
    const ZOOMING = 'zooming'
    const PANNING = 'panning';
    const SELECTION = 'selection';

    let mCodeUtil = new CodeUtil();

    let mHighlightCallback = () => { };
    let mMergeElementCallback = () => { };
    let mMoveElementCallback = () => { }
    let mMoveStrokeCallback = () => { }
    let mContextMenuCallback = () => { }
    let mEditNameCallback = () => { };
    let mEditDomainCallback = () => { };
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
    let mFdlDimensionViewController = new FdlDimensionViewController(mDrawingUtil, mCodeUtil, mColorMap);

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

        mModel.getDimensions().forEach(dimension => {
            let dimensionData = {
                id: dimension.id,
                name: dimension.name,
                type: dimension.type,
                channel: dimension.channel,
                tier: dimension.tier,
            }
            let oldData = oldSimulationData.find(item => item.id == dimension.id);
            if (!oldData) {
                dimensionData.x = 0;
                dimensionData.y = 0;
            } else {
                dimensionData.x = oldData.x;
                dimensionData.y = oldData.y;
            }

            mSimulationData.push(dimensionData);

            if (dimension.type == DimensionType.DISCRETE) {
                dimension.levels.forEach(level => {
                    let levelData = {
                        id: level.id,
                        name: level.name,
                        dimension: dimension.id,
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
                let v1Data = {
                    id: DimensionValueId.V1,
                    name: dimension.domain[0],
                    dimension: dimension.id,
                    invalid: !DataUtil.isNumeric(dimension.domain[0]),
                };
                let oldV1Data = oldSimulationData.find(item => item.dimension == dimension.id && item.id == DimensionValueId.V1);
                if (oldV1Data) {
                    v1Data.x = oldV1Data.x;
                    v1Data.y = oldV1Data.y;
                } else {
                    v1Data.x = 0;
                    v1Data.y = 0;
                }

                let v2Data = {
                    id: DimensionValueId.V2,
                    name: dimension.domain[1],
                    dimension: dimension.id,
                    invalid: !DataUtil.isNumeric(dimension.domain[1]),
                };
                let oldV2Data = oldSimulationData.find(item => item.dimension == dimension.id && item.id == DimensionValueId.V2);
                if (oldV2Data) {
                    v2Data.x = oldV2Data.x;
                    v2Data.y = oldV2Data.y;
                } else {
                    v2Data.x = 0;
                    v2Data.y = 0;
                }
                mSimulationData.push(v1Data, v2Data);
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
        } else if (mode == FdlMode.DIMENSION) {
            mActiveViewController = mFdlDimensionViewController;
            mFdlDimensionViewController.setDimension(dimenId);
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
                let mouseDist = VectorUtil.subtract(screenCoords, mInteraction.start);
                let translate = VectorUtil.add(mInteraction.startTransform, mouseDist);
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

    mFdlDimensionViewController.setEditNameCallback((itemId, x, y, width, height) => {
        let bb = modelBoundingBoxToScreenBoundingBox(
            { x, y, height, width },
            mActiveViewController.getTranslate(),
            mActiveViewController.getScale())

        mEditNameCallback(itemId, bb.x, bb.y, bb.width, bb.height);
    })

    mFdlDimensionViewController.setEditDomainCallback((dimensionId, minMax, x, y, width, height) => {
        let bb = modelBoundingBoxToScreenBoundingBox(
            { x, y, height, width },
            mActiveViewController.getTranslate(),
            mActiveViewController.getScale())

        mEditDomainCallback(dimensionId, minMax, bb.x, bb.y, bb.width, bb.height);
    })

    mFdlDimensionViewController.setEditTypeCallback((dimensionId, x, y, width, height) => {
        let bb = modelBoundingBoxToScreenBoundingBox(
            { x, y, height, width },
            mActiveViewController.getTranslate(),
            mActiveViewController.getScale())

        mEditTypeCallback(dimensionId, bb.x, bb.y, bb.width, bb.height);
    })

    mFdlDimensionViewController.setEditChannelCallback((dimensionId, x, y, width, height) => {
        let bb = modelBoundingBoxToScreenBoundingBox(
            { x, y, height, width },
            mActiveViewController.getTranslate(),
            mActiveViewController.getScale())

        mEditChannelCallback(dimensionId, bb.x, bb.y, bb.width, bb.height);
    })

    mFdlDimensionViewController.setEditTierCallback((dimensionId, x, y, width, height) => {
        let bb = modelBoundingBoxToScreenBoundingBox(
            { x, y, height, width },
            mActiveViewController.getTranslate(),
            mActiveViewController.getScale())

        mEditTierCallback(dimensionId, bb.x, bb.y, bb.width, bb.height);
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
        setAddDimensionCallback: (func) => mFdlLegendViewController.setAddDimensionCallback(func),
        setClickDimensionCallback: (func) => mFdlLegendViewController.setClickDimensionCallback(func),
        setAddLevelCallback: (func) => mFdlDimensionViewController.setAddLevelCallback(func),
        setUpdateLevelCallback: (func) => mFdlDimensionViewController.setUpdateLevelCallback(func),
        setEditNameCallback: (func) => mEditNameCallback = func,
        setEditDomainCallback: (func) => mEditDomainCallback = func,
        setEditTypeCallback: (func) => mEditTypeCallback = func,
        setEditChannelCallback: (func) => mEditChannelCallback = func,
        setEditTierCallback: (func) => mEditTierCallback = func,
        setMergeElementCallback: (func) => mMergeElementCallback = func,
        setMoveElementCallback: (func) => mMoveElementCallback = func,
        setContextMenuCallback: (func) => mContextMenuCallback = func,
    }
}

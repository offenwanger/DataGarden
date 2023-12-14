
function FdlViewController(mColorMap) {
    const SELECTION_BUBBLE_COLOR = "#55555555";

    let mCodeUtil = new CodeUtil();

    let mMergeElementCallback = () => { };
    let mMoveElementCallback = () => { }
    let mMoveStrokeCallback = () => { }
    let mContextMenuCallback = () => { }
    let mHighlightCallback = () => { }
    let mSelectionCallback = () => { }
    let mEditNameCallback = () => { };
    let mEditDomainCallback = () => { };
    let mEditTypeCallback = () => { };
    let mEditChannelCallback = () => { };
    let mEditTierCallback = () => { };

    let mModel = new DataModel();
    let mSimulationData = [];
    let mInteraction = null;

    let mHighlightIds = [];
    let mSelectionIds = [];

    let mCanvas = d3.select('#fdl-view-container').select('.canvas-container').append('canvas')
        .classed('view-canvas', true);
    let mInterfaceCanvas = d3.select("#fdl-view-container").select('.canvas-container').append('canvas')
        .classed('interface-canvas', true);
    let mInteractionCanvas = d3.select("#fdl-view-container").select('.canvas-container').append('canvas')
        .style("opacity", 0)
        .classed('interaction-canvas', true);

    let mDrawingUtil = new DrawingUtil(
        mCanvas.node().getContext("2d"),
        mInteractionCanvas.node().getContext("2d"),
        mInterfaceCanvas.node().getContext("2d"),
    );
    let mOverlayUtil = new OverlayUtil();

    let mFdlParentViewController = new FdlParentViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap);
    let mFdlLegendViewController = new FdlLegendViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap);
    let mFdlDimensionViewController = new FdlDimensionViewController(mDrawingUtil, mOverlayUtil, mCodeUtil, mColorMap);

    let mActiveViewController = mFdlParentViewController;

    function onModelUpdate(model) {
        mModel = model;
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
                fx: AxisPositions.DIMENSION_X,
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
                        fx: AxisPositions.LEVEL_X,
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
                    v1Data.fx = oldV1Data.fx;
                    v1Data.y = oldV1Data.y;
                } else {
                    v1Data.fx = AxisPositions.LEVEL_X;
                    v1Data.y = 0;
                }

                let v2Data = {
                    id: DimensionValueId.V2,
                    name: dimension.domain[1],
                    dimension: dimension.id,
                    invalid: !DataUtil.isNumeric(dimension.domain[1]),
                    fx: AxisPositions.LEVEL_X,
                };
                let oldV2Data = oldSimulationData.find(item => item.dimension == dimension.id && item.id == DimensionValueId.V2);
                if (oldV2Data) {
                    v2Data.fx = oldV2Data.fx;
                    v2Data.y = oldV2Data.y;
                } else {
                    v2Data.fx = AxisPositions.LEVEL_X;
                    v2Data.y = 0;
                }
                mSimulationData.push(v1Data, v2Data);
            }
        });

        mActiveViewController.updateSimulationData(mSimulationData, mModel);
        mActiveViewController.onHighlight(mHighlightIds);
        mActiveViewController.onSelection(mSelectionIds);
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
        mActiveViewController.onHighlight(mHighlightIds);
        mActiveViewController.onSelection(mSelectionIds);
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

        mOverlayUtil.onResize(width, height);
    }

    function onPointerDown(screenCoords, systemState) {
        if (ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
            console.error("Bad event state", screenCoords, systemState.getToolState()); return;
        };

        if (systemState.getToolState() == Buttons.PANNING_BUTTON) {
            mInteraction = {
                type: FdlInteraction.PANNING,
                start: screenCoords,
                startTransform: mActiveViewController.getTranslate(),
            }
        } else if (systemState.getToolState() == Buttons.ZOOM_BUTTON) {
            mInteraction = {
                type: FdlInteraction.ZOOMING,
                start: screenCoords,
                startTransform: mActiveViewController.getTranslate(),
                scale: mActiveViewController.getScale(),
            }
        } else if (systemState.getToolState() == Buttons.SELECTION_BUTTON || systemState.getToolState() == Buttons.BRUSH_BUTTON) {
            let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            if (target) {
                if (systemState.isCtrl()) {
                    mSelectionIds.splice(mSelectionIds.indexOf(target.id), 1);
                    mSelectionCallback(DataUtil.unique(mSelectionIds));
                } else {
                    if (systemState.isShift()) {
                        mSelectionIds.push(target.id);
                        mSelectionCallback(mSelectionIds);
                    } else if (!mSelectionIds.includes(target.id)) {
                        mSelectionIds = [target.id];
                        mSelectionCallback(mSelectionIds);
                    }

                    mInteraction = {
                        type: FdlInteraction.SELECTION,
                        start: screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale()),
                        startTarget: target,
                    }
                    mInteraction.target = mSelectionIds;
                    mActiveViewController.interactionStart(mInteraction, mInteraction.start);
                }
            } else {
                let modelCoords = screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale());
                mActiveViewController.stop();
                mInteraction = {
                    type: FdlInteraction.LASSO,
                    path: [modelCoords]
                }
            }
        } else {
            console.error("Unhandled state!", systemState.getToolState());
        }
    }

    function onDblClick(screenCoords, systemState) {

    }

    function onPointerMove(screenCoords, systemState) {
        if (mInteraction) {
            if (mInteraction.type == FdlInteraction.PANNING) {
                let mouseDist = VectorUtil.subtract(screenCoords, mInteraction.start);
                let translate = VectorUtil.add(mInteraction.startTransform, mouseDist);
                mActiveViewController.pan(translate.x, translate.y)
            } else if (mInteraction.type == FdlInteraction.ZOOMING) {
                let mouseDist = screenCoords.y - mInteraction.start.y;
                let scale = mInteraction.scale * (1 + (mouseDist / mInterfaceCanvas.attr('height')));
                let zoomChange = scale - mInteraction.scale;
                let transformX = -(mInteraction.start.x * zoomChange) + mInteraction.startTransform.x;
                let transformY = -(mInteraction.start.x * zoomChange) + mInteraction.startTransform.y;
                mActiveViewController.zoom(transformX, transformY, scale);
            } else if (mInteraction.type == FdlInteraction.SELECTION) {
                let modelCoords = screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale());
                mInteraction.mouseOverTarget = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
                mActiveViewController.interactionDrag(mInteraction, modelCoords);
            } else if (mInteraction.type == FdlInteraction.LASSO) {
                let modelCoords = screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale());
                mInteraction.path.push(modelCoords);
                mDrawingUtil.resetInterface(mActiveViewController.getZoomTransform());
                mDrawingUtil.drawInterfaceSelectionBubble(mInteraction.path, SELECTION_BUBBLE_COLOR);
            } else {
                console.error("Unimplimented!")
            }
        }

        let target = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
        if (target) {
            mHighlightIds = [target.id]
            mHighlightCallback(mHighlightIds);
        } else if (!ValUtil.outOfBounds(screenCoords, mInteractionCanvas.node().getBoundingClientRect())) {
            mHighlightCallback([]);
        }
    }

    function onPointerUp(screenCoords, systemState) {
        let interaction = mInteraction;
        mInteraction = null;

        if (interaction && interaction.type == FdlInteraction.SELECTION) {
            let modelCoords = screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale());
            interaction.endTarget = mCodeUtil.getTarget(screenCoords, mInteractionCanvas);
            mActiveViewController.interactionEnd(interaction, modelCoords);
        } else if (interaction && interaction.type == FdlInteraction.LASSO) {
            mDrawingUtil.resetInterface(mActiveViewController.getZoomTransform());
            mActiveViewController.start();
            let modelCoords = screenToModelCoords(screenCoords, mActiveViewController.getTranslate(), mActiveViewController.getScale());
            let selectedIds = mActiveViewController.interactionEnd(interaction, modelCoords);
            if (systemState.isShift()) {
                mSelectionCallback(DataUtil.unique(mSelectionIds.concat(selectedIds)))
            } else if (systemState.isCtrl()) {
                mSelectionCallback(mSelectionIds.filter(id => !selectedIds.includes(id)));
            } else {
                mSelectionCallback(selectedIds);
            }
        }
    }

    function onHighlight(selection) {
        mActiveViewController.onHighlight(selection);
    }

    function onSelection(selectedIds) {
        mSelectionIds = DataUtil.unique(selectedIds.map(id => {
            if (IdUtil.isType(id, Data.Stroke)) {
                let element = mModel.getElementForStroke(id);
                if (!element) { console.error("Bad state, element not found for stroke"); return id; }
                return element.id;
            } else {
                return id;
            }
        }));
        mActiveViewController.onSelection(mSelectionIds);
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
        onSelection,
        onHighlight,
        hide,
        show,
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
        setHighlightCallback: (func) => mHighlightCallback = func,
        setSelectionCallback: (func) => mSelectionCallback = func,
    }
}

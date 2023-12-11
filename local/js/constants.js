const Buttons = {
    BRUSH_BUTTON: "Brush",
    SELECTION_BUTTON: "Selection",
    PANNING_BUTTON: "Pan",
    ZOOM_BUTTON: "Zoom",
    VIEW_BUTTON: "View",
    COLOR_BUTTON: "Color",
}

const Size = {
    ELEMENT_NODE_SIZE: 20,
    DIMENSION_SIZE: 40,
    LEVEL_SIZE: 30,
}

const Padding = {
    NODE: 5,
    CLUSTER: 20,
}

const ContextButtons = {
    CENTER: 'center',
    ADD_DIMENSION_FOR_FORM: 'add-dimension-for-form',
    ADD_DIMENSION_FOR_COLOR: 'add-dimension-for-color',
    ADD_DIMENSION_FOR_SIZE: 'add-dimension-for-size',
    ADD_DIMENSION_FOR_ANGLE: 'add-dimension-for-angle',
    ADD_DIMENSION_FOR_POSITION: 'add-dimension-for-position',
    MERGE_TO_ELEMENT: 'merge-to-element',
    AUTO_MERGE_ELEMENTS: 'auto-merge-elements',
    SPINE: 'recalculate-spine',
    STYLE_STRIP: 'style-element-strip',
    STYLE_STROKES: 'style-element-strokes',
}

const ChannelType = {
    FORM: "form",
    COLOR: "color",
    SIZE: "size",
    ANGLE: "angle",
    POSITION: "position",
}

const DimensionType = {
    DISCRETE: 'discrete',
    CONTINUOUS: 'continuous',
}

const DimensionValueId = {
    V1: "v1",
    V2: "v2",
}

const ContextButtonToChannelType = {};
ContextButtonToChannelType[ContextButtons.ADD_DIMENSION_FOR_FORM] = ChannelType.FORM;
ContextButtonToChannelType[ContextButtons.ADD_DIMENSION_FOR_COLOR] = ChannelType.COLOR;
ContextButtonToChannelType[ContextButtons.ADD_DIMENSION_FOR_SIZE] = ChannelType.SIZE;
ContextButtonToChannelType[ContextButtons.ADD_DIMENSION_FOR_ANGLE] = ChannelType.ANGLE;
ContextButtonToChannelType[ContextButtons.ADD_DIMENSION_FOR_POSITION] = ChannelType.POSITION;

const Tab = {
    PARENT: "parent",
    LEGEND: "legend",
    TABLE: "table"
}

const FdlMode = {
    DIMENSION: "dimension",
    PARENT: "parent",
    LEGEND: "legend",
}

const AxisPositions = {
    DIMENSION_X: 10,
    LEVEL_X: 20,
}

const DimensionLabels = {};
DimensionLabels[DimensionType.DISCRETE] = 'disc';
DimensionLabels[DimensionType.CONTINUOUS] = 'cont';

const ChannelLabels = {};
ChannelLabels[ChannelType.FORM] = 'form';
ChannelLabels[ChannelType.COLOR] = 'color';
ChannelLabels[ChannelType.SIZE] = 'size';
ChannelLabels[ChannelType.ANGLE] = 'angle';
ChannelLabels[ChannelType.POSITION] = 'pos';

const Decay = {
    ALPHA: .0005,
    VELOCITY: 0.7,
}

const DropDown = {
    TYPE: "type",
    CHANNEL: "channel",
    TIER: "tier",
}

const FdlInteraction = {
    ZOOMING: 'zooming',
    PANNING: 'panning',
    SELECTION: 'selection',
    LASSO: 'lasso',
}
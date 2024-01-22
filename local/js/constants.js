export const Buttons = {
    CURSOR_BUTTON: "Cursor",
    BRUSH_BUTTON: "Brush",
    SELECTION_BUTTON: "Selection",
    PANNING_BUTTON: "Pan",
    ZOOM_BUTTON: "Zoom",
    VIEW_BUTTON: "View",
    COLOR_BUTTON: "Color",
    DOWNLOAD: "Download",
    UPLOAD: "Upload",
}

export const Size = {
    ELEMENT_NODE_SIZE: 20,
    DIMENSION_SIZE: 40,
    LEVEL_SIZE: 30,
}

export const Padding = {
    NODE: 5,
    CLUSTER: 20,
    LEVEL: 5,
}

export const ContextButtons = {
    CENTER: 'center',
    ADD_DIMENSION_FOR_FORM: 'add-dimension-for-form',
    ADD_DIMENSION_FOR_COLOR: 'add-dimension-for-color',
    ADD_DIMENSION_FOR_SIZE: 'add-dimension-for-size',
    ADD_DIMENSION_FOR_ANGLE: 'add-dimension-for-angle',
    ADD_DIMENSION_FOR_POSITION: 'add-dimension-for-position',
    MERGE: 'merge-mode',
    SPINE: 'recalculate-spine',
    STYLE_STRIP: 'style-element-strip',
    STYLE_STROKES: 'style-element-strokes',
    DELETE: 'delete-the-stuff',
    PARENT: 'parent-mode',
    COLOR: 'color'
}

export const ChannelType = {
    FORM: "form",
    COLOR: "color",
    SIZE: "size",
    ANGLE: "angle",
    POSITION: "position",
}

export const DimensionType = {
    DISCRETE: 'discrete',
    CONTINUOUS: 'continuous',
}

export const DimensionValueId = {
    V1: "v1",
    V2: "v2",
}

export const Tab = {
    PARENT: "parent",
    LEGEND: "legend",
    TABLE: "table"
}

export const FdlMode = {
    DIMENSION: "dimension",
    PARENT: "parent",
    LEGEND: "legend",
}

export const AxisPositions = {
    DIMENSION_X: 10,
    LEVEL_X: 20,
}

export const DimensionLabels = {};
DimensionLabels[DimensionType.DISCRETE] = 'disc';
DimensionLabels[DimensionType.CONTINUOUS] = 'cont';

export const ChannelLabels = {};
ChannelLabels[ChannelType.FORM] = 'form';
ChannelLabels[ChannelType.COLOR] = 'color';
ChannelLabels[ChannelType.SIZE] = 'size';
ChannelLabels[ChannelType.ANGLE] = 'angle';
ChannelLabels[ChannelType.POSITION] = 'pos';

export const Decay = {
    ALPHA: .0005,
    VELOCITY: 0.7,
}

export const DropDown = {
    TYPE: "type",
    CHANNEL: "channel",
    TIER: "tier",
}

export const FdlInteraction = {
    ZOOMING: 'zooming',
    PANNING: 'panning',
    SELECTION: 'selection',
    LASSO: 'lasso',
}
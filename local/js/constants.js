const Buttons = {
    BRUSH_BUTTON: "Brush",
    SELECTION_BUTTON: "Selection",
    PANNING_BUTTON: "Pan",
    ZOOM_BUTTON: "Zoom",
    VIEW_BUTTON: "View",
}

const Size = {
    ELEMENT_NODE_SIZE: 20,
    DIMENTION_SIZE: 40,
    LEVEL_SIZE: 30,
}

const Padding = {
    NODE: 5,
    CLUSTER: 20,
}

const MappingTypes = {
    CONT_CONT: "continuousDimetion-continuousChannel",
    CONT_DISC: "continuousDimetion-discreteChannel",
    DISC_CONT: "discreteDimetion-continuousChannel",
    DISC_DISC: "discreteDimetion-discreteChannel",
}

const ContextButtons = {
    CENTER: 'center',
    ADD_DIMENTION_FOR_FORM: 'add-dimention-for-form',
    ADD_DIMENTION_FOR_COLOR: 'add-dimention-for-color',
    ADD_DIMENTION_FOR_SIZE: 'add-dimention-for-size',
    ADD_DIMENTION_FOR_ANGLE: 'add-dimention-for-angle',
    ADD_DIMENTION_FOR_POSITION: 'add-dimention-for-position',
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

const DimentionType = {
    DISCRETE: 'discrete',
    CONTINUOUS: 'continuous',
}

const ContextButtonToChannelType = {};
ContextButtonToChannelType[ContextButtons.ADD_DIMENTION_FOR_FORM] = ChannelType.FORM;
ContextButtonToChannelType[ContextButtons.ADD_DIMENTION_FOR_COLOR] = ChannelType.COLOR;
ContextButtonToChannelType[ContextButtons.ADD_DIMENTION_FOR_SIZE] = ChannelType.SIZE;
ContextButtonToChannelType[ContextButtons.ADD_DIMENTION_FOR_ANGLE] = ChannelType.ANGLE;
ContextButtonToChannelType[ContextButtons.ADD_DIMENTION_FOR_POSITION] = ChannelType.POSITION;

const Tab = {
    PARENT: "parent",
    LEGEND: "legend",
    TABLE: "table"
}

const FdlMode = {
    DIMENTION: "dimention",
    PARENT: "parent",
    LEGEND: "legend",
}

const AxisPositions = {
    DIMENTION_X: 10,
    LEVEL_X: 20,
}

const DimentionLabels = {};
DimentionLabels[DimentionType.DISCRETE] = 'disc';
DimentionLabels[DimentionType.CONTINUOUS] = 'cont';

const ChannelLabels = {};
ChannelLabels[ChannelType.FORM] = 'form';
ChannelLabels[ChannelType.COLOR] = 'color';
ChannelLabels[ChannelType.SIZE] = 'size';
ChannelLabels[ChannelType.ANGLE] = 'angle';
ChannelLabels[ChannelType.POSITION] = 'pos';
const Buttons = {
    BRUSH_BUTTON: "Brush",
    SELECTION_BUTTON: "Selection",
    PANNING_BUTTON: "Pan",
    ZOOM_BUTTON: "Zoom",
    VIEW_BUTTON: "View",
}

const Size = {
    ELEMENT_NODE_SIZE: 20,
    STROKE_NODE_SIZE: 15,
    DIMENTION_NODE_SIZE: 15,
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
    ADD_DIMENTION_FOR_ORIENTATION: 'add-dimention-for-orientation',
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
    ORIENTATION: "orientation",
    POSITION: "position",
}

const ContextButtonToChannelType = {};
ContextButtonToChannelType[ContextButtons.ADD_DIMENTION_FOR_FORM] = ChannelType.FORM;
ContextButtonToChannelType[ContextButtons.ADD_DIMENTION_FOR_COLOR] = ChannelType.COLOR;
ContextButtonToChannelType[ContextButtons.ADD_DIMENTION_FOR_SIZE] = ChannelType.SIZE;
ContextButtonToChannelType[ContextButtons.ADD_DIMENTION_FOR_ORIENTATION] = ChannelType.ORIENTATION;
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
const Buttons = {
    BRUSH_BUTTON: "Brush",
    SELECTION_BUTTON: "Selection",
    PANNING_BUTTON: "Pan",
    ZOOM_BUTTON: "Zoom",
    VIEW_BUTTON: "View",
}

const Size = {
    ICON_LARGE: 128,
    ICON_MEDIUM: 64,
    NODE_TINY: 16,
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

const EventResponse = {
    HOLD: 'hold',
    CONTEXT_MENU_GROUP: 'contextMenuGroup'
}
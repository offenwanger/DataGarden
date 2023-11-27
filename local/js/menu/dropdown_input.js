function DropdownInput() {
    let mSelectedCallback = (item) => { };

    let mShowingId = false;
    let mShowingType = null;
    let mDropdownContainer = d3.select('#dropdown-container');
    let mTypeSelect = mDropdownContainer.append("select");
    mTypeSelect.append("option").attr("value", DimensionType.DISCRETE).html("Discrete");
    mTypeSelect.append("option").attr("value", DimensionType.CONTINUOUS).html("Continuous");
    let mChannelSelect = mDropdownContainer.append("select");
    mChannelSelect.append("option").attr("value", ChannelType.FORM).html("Form");
    mChannelSelect.append("option").attr("value", ChannelType.COLOR).html("Color");
    mChannelSelect.append("option").attr("value", ChannelType.SIZE).html("Size");
    mChannelSelect.append("option").attr("value", ChannelType.ANGLE).html("Angle");
    mChannelSelect.append("option").attr("value", ChannelType.POSITION).html("Position");
    let mContinuousChannelSelect = mDropdownContainer.append("select");
    mContinuousChannelSelect.append("option").attr("value", ChannelType.SIZE).html("Size");
    mContinuousChannelSelect.append("option").attr("value", ChannelType.ANGLE).html("Angle");
    mContinuousChannelSelect.append("option").attr("value", ChannelType.POSITION).html("Position");
    let mTierSelect = mDropdownContainer.append("select");

    mTypeSelect.on('change', onChange).on('blur', onBlur);
    mChannelSelect.on('change', onChange).on('blur', onBlur);
    mContinuousChannelSelect.on('change', onChange).on('blur', onBlur);
    mTierSelect.on('change', onChange).on('blur', onBlur);

    function onChange() {
        if (mShowingId) {
            mSelectedCallback(mShowingType, mShowingId, d3.select(this).property("value"));
            mShowingId = false;
        }
        hide();
    }

    function onBlur() {
        hide();
    }

    function onModelUpdate(model) {
        let maxTier = model.getElements().reduce((max, element) => Math.max(max, DataUtil.getTreeLevel(model, element.id)), 0);
        mTierSelect.html("");
        for (let i = 0; i <= maxTier; i++) {
            mTierSelect.append("option").attr("value", i).html("Tier " + i);
        }
    }

    function show(dropdownType, itemId, value, x, y, width, height) {
        mTypeSelect.style("display", "none");
        mChannelSelect.style("display", "none");
        mContinuousChannelSelect.style("display", "none");
        mTierSelect.style("display", "none");
        mDropdownContainer.style('top', y + 'px')
            .style('left', (x + 10) + 'px')
            .style('height', height + 'px')
            .style('width', width + 'px');
        let selectedDropdown;
        if (dropdownType == DropDown.TYPE) {
            selectedDropdown = mTypeSelect;
        } else if (dropdownType == DropDown.CHANNEL) {
            selectedDropdown = mChannelSelect;
        } else if (dropdownType == DropDown.CONTINUOUS_CHANNEL) {
            selectedDropdown = mContinuousChannelSelect;
        } else if (dropdownType == DropDown.TIER) {
            selectedDropdown = mTierSelect
        }
        selectedDropdown.property("value", value)
            .style('height', height + 'px')
            .style('width', width + 'px')
            .style("display", "");
        selectedDropdown.node().focus();

        mShowingType = dropdownType;
        mShowingId = itemId;
        mDropdownContainer.style("display", "");
    }

    function hide() {
        mDropdownContainer.style("display", "none");
    }

    hide();

    return {
        show,
        hide,
        onModelUpdate,
        isShowing: () => mShowingId ? true : false,
        setSelectedCallback: (func) => mSelectedCallback = func,
    }
}

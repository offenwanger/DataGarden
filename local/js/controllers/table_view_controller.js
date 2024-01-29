export function TableViewController() {
    let mTableDiv = d3.select("#table-view-container");

    let mSelectionCallback = () => { };
    let mHighlightCallback = () => { };

    function onModelUpdate(model) {
        // TODO: Don't do this, update the data instead
        mTableDiv.selectAll("*").remove();

        model.getTables().forEach((table) => {
            let tableDiv = mTableDiv.append("div");
            mTableDiv.append("br");

            let dimens = table.cols
                .map(id => model.getDimension(id))
                .filter((d, index) => {
                    if (!d) { console.error("invalid dimen id", table.cols[index]); return false; }
                    return true;
                })
            dimens.sort((a, b) => a.tier != b.tier ? a.tier - b.tier : a.id.localeCompare(b.id, 'en', { numeric: true }));

            let columns = dimens.map(dimen => {
                return { type: 'text', title: dimen.name, width: 200 };
            })
            let data = table.rows.map(r => dimens.map(d => r[d.id] ? r[d.id].value : null));
            jspreadsheet(tableDiv.node(), { data, columns });
        })
    }

    function onResize(width, height) {
        mTableDiv.style("height", height + "px")
            .style("width", width + "px");
    }

    function hide() {
        mTableDiv.style("display", "none");
    }

    function show() {
        mTableDiv.style("display", "");
    }

    function onSelection() {
        // TODO impliment
    }

    function onHighlight() {
        // TODO impliment
    }

    return {
        onResize,
        onModelUpdate,
        onSelection,
        onHighlight,
        setSelectionCallback: (func) => mSelectionCallback = func,
        setHighlightCallback: (func) => mHighlightCallback = func,
        hide,
        show,
    }
}
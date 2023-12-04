function TableViewController() {
    let mTableDiv = d3.select("#table-view-container");

    let mSelectionCallback = () => { };
    let mHighlightCallback = () => { };

    function onModelUpdate(model) {
        // TODO: Don't do this, update the data instead
        mTableDiv.selectAll("*").remove();

        model.getTables().forEach((table) => {
            let tableDiv = mTableDiv.append("div");
            mTableDiv.append("br");

            let header = table.cols.map(id => {
                let dimen = model.getDimension(id);
                if (!dimen) { console.error("invalid dimen id", id); return ""; }
                return dimen.name;
            });
            let columns = header.map(header => {
                return { type: 'text', title: header, width: 200 };
            })
            let data = table.rows.map(r => table.cols.map(c => r[c] ? r[c].value : null));
            jspreadsheet(tableDiv.node(), { header, data, columns });
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
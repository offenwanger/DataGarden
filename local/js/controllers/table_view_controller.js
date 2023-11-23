function TableViewController() {
    let mTableDiv = d3.select("#table-view-container");

    function onModelUpdate(model) {
        // TODO: Don't do this, update the data instead
        mTableDiv.selectAll("*").remove();

        model.getTables().forEach((table) => {
            let tableDiv = mTableDiv.append("div");
            mTableDiv.append("br");

            let header = table.cols.map(id => {
                let dimen = model.getDimention(id);
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

    return {
        onResize,
        onModelUpdate,
        hide,
        show,
    }
}
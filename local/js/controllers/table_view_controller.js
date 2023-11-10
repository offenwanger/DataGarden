function TableViewController() {
    let mTableDiv = d3.select("#table-view");

    function onModelUpdate(model) {
        mTableDiv.selectAll("*").remove();

        model.getTables().forEach((table, index) => {
            let tableDiv = mTableDiv.append("div");
            mTableDiv.append("br");

            let header = table[0];
            let columns = header.map(header => {
                return { type: 'text', title: header, width: 200 };
            })
            jspreadsheet(tableDiv.node(), {
                data: table.slice(1),
                columns,
            });
        })
    }

    function onResize(width, height) {
        mTableDiv.style("height", height + "px")
            .style("width", width + "px");
    }

    return {
        onResize,
        onModelUpdate,
    }
}
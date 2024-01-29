import { Data } from "../data_structs.js";
import { DataModel } from "../data_model.js";
import { IdUtil } from "../utils/id_util.js";

export function TableViewController(mColorMap) {
    const TABLE_ID = "data-table-"

    let mModel = new DataModel();

    let mTablesContainer = d3.select("#table-view-container");
    let mJTables = []
    let mDataTables = [];

    let mSelection = []
    let mHighlight = [];

    let mSelectionCallback = () => { };
    let mHighlightCallback = () => { };

    function onModelUpdate(model) {
        mModel = model;
        // TODO: Don't do this, update the data instead
        mTablesContainer.selectAll("*").remove();
        mJTables = [];
        mDataTables = [];

        model.getTables().forEach((modelTable, index) => {
            let dimens = modelTable.cols.map(id => model.getDimension(id));
            // error checking
            dimens = dimens.filter((d, index) => { if (d) { return true; } else { console.error("invalid dimen id", modelTable.cols[index]); return false; } });
            dimens.sort((a, b) => a.tier != b.tier ? a.tier - b.tier : a.id.localeCompare(b.id, 'en', { numeric: true }));

            modelTable.cols = dimens;
            mDataTables.push(modelTable)

            if (index > 0) mTablesContainer.append("br");
            let tableDiv = mTablesContainer.append("div")
                .attr('id', TABLE_ID + index)
                .attr('tableIndex', index)
            let jtable = jspreadsheet(tableDiv.node(), {
                data: modelTable.rows.map(r => dimens
                    .map(d => r[d.id])
                    .map(data => data ? data.value : "")),
                columns: dimens.map(dimen => {
                    return {
                        type: 'text',
                        title: dimen.name,
                        width: 200,
                        // readOnly: true,
                    };
                }),
                meta: modelTable.rows.reduce((obj, rowData, rowIndex) => {
                    dimens.forEach((dimen, colIndex) => {
                        if (rowData[dimen.id]) {
                            let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(colIndex, rowIndex);
                            obj[cellIndex] = rowData[dimen.id]
                        }
                    })
                    return obj;
                }, {}),
                contextMenu: () => { },
                onselection,
            });
            mJTables.push(jtable);
        })

        restyle();
    }

    function onselection(tableDiv, colStart, rowStart, colEnd, rowEnd) {
        mSelection = [];
        for (let col = colStart; col <= colEnd; col++) {
            for (let row = rowStart; row <= rowEnd; row++) {
                let index = d3.select(tableDiv).attr("tableIndex");
                let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(col, row);
                mSelection.push(mJTables[index].getMeta(cellIndex).id)
            }
        }
        mSelectionCallback(mSelection);
    }

    function restyle() {
        mDataTables.forEach((dataTable, index) => {
            let cellIndexes = []
            for (let col = 0; col < dataTable.cols.length; col++) {
                for (let row = 0; row < dataTable.rows.length; row++) {
                    cellIndexes.push(jspreadsheet.helpers.getColumnNameFromCoords(col, row))
                }
            }

            let styles = {}
            cellIndexes.forEach(cellIndex => {
                let meta = mJTables[index].getMeta(cellIndex);
                let style = '';
                style += 'color: black; ';
                if (mSelection.includes(meta.id)) {
                    style += 'background-color: ' + mColorMap(meta.id) + '; ';
                } else {
                    style += 'background-color:white; ';
                }
                styles[cellIndex] = style;
            })
            mJTables[index].setStyle(styles)
        })
    }

    function onResize(width, height) {
        mTablesContainer.style("height", height + "px")
            .style("width", width + "px");
    }

    function hide() {
        mTablesContainer.style("display", "none");
    }

    function show() {
        mTablesContainer.style("display", "");
    }

    function onSelection(selection) {
        mSelection = [];
        mSelection.push(...selection.filter(id => IdUtil.isType(id, Data.Element)))
        selection.filter(id => IdUtil.isType(id, Data.Stroke)).forEach(strokeId => {
            let element = mModel.getElementForStroke(strokeId);
            if (element) {
                mSelection.push(element.id);
            } else {
                console.error("invalid stroke id", strokeId);
            }
        });
        restyle();
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
import { Data } from "../data_structs.js";
import { DataModel } from "../data_model.js";
import { IdUtil } from "../utils/id_util.js";

export function TableViewController(mColorMap) {
    const TABLE_ID = "data-table-"

    const GENERATE_MODEL_LABEL = 'Generator Mode';
    const CLEAR_MODEL_LABEL = 'Clear Generated Model';

    let mSelectionCallback = () => { };
    let mHighlightCallback = () => { };
    let mModelGeneratedCallback = () => { }
    let mClearGeneratedModelCallback = () => { }

    let mEditingMode = false;
    let mPasting = false;

    let mModel = new DataModel();

    let mViewContainer = d3.select("#table-view-container")
    let mGenerateButton = mViewContainer.append('button')
        .attr('id', 'generate-button')
        .html(GENERATE_MODEL_LABEL)
        .on('click', modelGenerationMode)
        .style("display", "none");
    let mTablesContainer = mViewContainer.append('div').attr('id', 'tables-container');

    let mJTables = []
    let mDataTables = [];

    let mSelection = []
    let mHighlight = [];


    function onModelUpdate(model) {
        mModel = model;
        // TODO: Don't do this, update the data instead
        mTablesContainer.selectAll("*").remove();
        mJTables = [];
        mDataTables = [];

        model.getTables().forEach((modelTable, index) => {
            mDataTables.push(modelTable)

            if (index > 0) mTablesContainer.append("br");
            let tableDiv = mTablesContainer.append("div")
                .attr('id', TABLE_ID + index)
                .attr('tableIndex', index)
            let jtable = jspreadsheet(tableDiv.node(), {
                data: modelTable.getDataArray().map(r => r.map(c => c.value)),
                columns: modelTable.getColumns().map(col => {
                    return {
                        type: 'text',
                        title: col.name,
                        width: 200,
                    };
                }),
                meta: modelTable.getDataArray().reduce((obj, rowData, rowIndex) => {
                    rowData.forEach((cellData, colIndex) => {
                        let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(colIndex, rowIndex);
                        obj[cellIndex] = cellData
                    })
                    return obj;
                }, {}),
                contextMenu: () => { },
                onselection,
                onbeforechange,
                onchange,
                onbeforepaste,
                onpaste,
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

    function onbeforechange(instance, cell, x, y, value) {
        if (mEditingMode) {
            return value;
        } else {
            let index = d3.select(instance).attr('tableindex');
            let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(x, y);
            let meta = mJTables[index].getMeta(cellIndex)
            return meta.value;
        }
    }

    function onchange(instance, cell, x, y, value) {
        if (mEditingMode && !mPasting) {
            parseTables();
        }
    }

    function onbeforepaste(instance, data, x, y) {
        if (mEditingMode) {
            mPasting = true;
        } else return false;
    }

    function onpaste(instance, data) {
        mPasting = false;
        if (mEditingMode) {
            parseTables();
        }
    }


    function restyle() {
        mDataTables.forEach((dataTable, index) => {
            let cellIndexes = []
            for (let col = 0; col < dataTable.getColumns().length; col++) {
                for (let row = 0; row < dataTable.getDataArray().length; row++) {
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

    function modelGenerationMode() {
        mEditingMode = true;
        mGenerateButton.html(CLEAR_MODEL_LABEL);
        mGenerateButton.on('click', clearModelMode);
        parseTables();
    }

    function clearModelMode() {
        mEditingMode = false;
        mGenerateButton.html(GENERATE_MODEL_LABEL);
        mGenerateButton.on('click', modelGenerationMode);
        mClearGeneratedModelCallback();
    }

    function parseTables() {
        let model = new DataModel();
        mModelGeneratedCallback();
    }

    function onResize(width, height) {
        mViewContainer.style("height", height + "px")
            .style("width", width + "px");
    }

    function hide() {
        mViewContainer.style("display", "none");
    }

    function show() {
        mViewContainer.style("display", "");
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
        setModelGeneratedCallback: (func) => mModelGeneratedCallback = func,
        setClearGeneratedModelCallback: (func) => mClearGeneratedModelCallback = func,
        hide,
        show,
    }
}
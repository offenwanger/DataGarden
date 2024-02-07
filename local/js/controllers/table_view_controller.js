import { Data } from "../data_structs.js";
import { DataModel } from "../data_model.js";
import { IdUtil } from "../utils/id_util.js";

export function TableViewController(mColorMap) {
    const TABLE_ID = "data-table-"

    const GENERATE_MODEL_LABEL = 'Generator Mode';
    const CLEAR_MODEL_LABEL = 'Clear Generated Model';

    const DEFAULT_COL_WIDTH = 100;

    let mSelectionCallback = () => { };
    let mHighlightCallback = () => { };
    let mModelGeneratedCallback = () => { }
    let mClearGeneratedModelCallback = () => { }

    let mEditingMode = false;
    let mPasting = false;

    let mModel = new DataModel();
    let mOriginalModel = new DataModel();

    let mViewContainer = d3.select("#table-view-container")
    let mGenerateButton = mViewContainer.append('button')
        .attr('id', 'generate-button')
        .html(GENERATE_MODEL_LABEL)
        .on('click', modelGenerationMode)
        .style("display", "none");
    let mTablesContainer = mViewContainer.append('div').attr('id', 'tables-container');

    let mJTables = [];
    let mTableDivs = [];
    let mDataTables = [];

    let mSelection = []
    let mHighlight = [];


    function onModelUpdate(model) {
        mModel = model;
        let tables = model.getTables();
        for (let index in tables) {
            if (!mTableDivs[index]) {
                // if (index > 0) mTableDivs[index].append("br");
                mTableDivs[index] = mTablesContainer.append("div")
                    .attr('id', TABLE_ID + index)
                    .attr('tableIndex', index)
                mJTables[index] = jspreadsheet(mTableDivs[index].node(), {
                    data: [['']],
                    columns: [{ width: DEFAULT_COL_WIDTH }],
                    meta: {},
                    contextMenu: () => { },
                    onselection,
                    onbeforechange,
                    onchange,
                    onbeforepaste,
                    onpaste,
                });
            }
        }
        if (mTableDivs.length > tables.length) {
            mTableDivs.splice(tables.length, mTableDivs.length - tables.length).forEach(div => div.remove());
        }

        mDataTables = [];
        tables.forEach((modelTable, index) => {
            mDataTables.push(modelTable)
            let colCount = mJTables[index].getData()[0].length;
            let newColCount = modelTable.getColumns().length;
            for (let i = colCount; i < newColCount; i++) {
                mJTables[index].insertColumn();
                mJTables[index].setWidth(i, DEFAULT_COL_WIDTH)
            }
            for (let i = newColCount; i < colCount; i++) {
                mJTables[index].removeColumn();
            }

            mJTables[index].setData(modelTable.getDataArray().map(r => r.map(c => c.value)));
            modelTable.getColumns().forEach((col, i) => { mJTables[index].setHeader(i, col.name); });
            mJTables[index].setMeta(modelTable.getDataArray().reduce((obj, rowData, rowIndex) => {
                rowData.forEach((cellData, colIndex) => {
                    let cellIndex = jspreadsheet.helpers.getColumnNameFromCoords(colIndex, rowIndex);
                    obj[cellIndex] = cellData
                })
                return obj;
            }, {}));
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
        mOriginalModel = mModel;
        mGenerateButton.html(CLEAR_MODEL_LABEL);
        mGenerateButton.on('click', clearModelMode);
        parseTables();
    }

    function clearModelMode() {
        mEditingMode = false;
        mGenerateButton.html(GENERATE_MODEL_LABEL);
        mGenerateButton.on('click', modelGenerationMode);
        mClearGeneratedModelCallback(mOriginalModel);
    }

    function parseTables() {
        let model = new DataModel();
        mJTables.forEach(table => {
            let data = mJTables.getData();
        })

        mModelGeneratedCallback(model);
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
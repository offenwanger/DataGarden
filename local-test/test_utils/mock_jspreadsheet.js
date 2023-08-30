

module.exports = function () {
    let tables = [];

    function removeTable(element) {
        tables = tables.filter(t => t.element != element);
    }

    function getTables() {
        return tables;
    }

    let mockJspreadsheet = function (element, { data, columns }) {
        tables.push({ element, data, columns });
    };
    Object.assign(mockJspreadsheet, {
        removeTable,
        getTables,
    });

    return mockJspreadsheet;
}

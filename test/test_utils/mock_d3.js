function Element(type) {
    let attrs = {};

    this.type = type;
    this.children = [];
    this.append = function (elementType) {
        let result = new Element(elementType);
        this.children.push(result);
        return result;
    }
    this.attr = function (att, val = null) {
        if (val !== null) {
            attrs[att] = val
            return this;
        };
        return attrs[att];
    };

}

module.exports = function () {
    let svgContainer = new Element("div");

    function select(selector) {
        if (selector == "#svg_container") return svgContainer;

    }


    this.select = select;
}
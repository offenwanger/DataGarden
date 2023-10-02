function ToolTip(svg) {
    let mText = svg.append("text")
        .style("font", "16px bold sans-serif")
        .style("stroke-linejoin", "round")
        .style("fill", "black")
        .style("stroke", "white")
        .style("stroke-width", "1px")
        .style("paint-order", "stroke");

    function show(x, y, text) {
        mText.attr("x", x + 10)
            .attr("y", y + 10)
            .text(text)
            .style("display", "");
    }

    function hide() {
        mText.style("display", "none");
    }

    return {
        show,
        hide,
    }
}
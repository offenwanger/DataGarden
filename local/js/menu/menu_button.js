import { FiltersUtil } from "../utils/filters_util.js";

export function MenuButton(id, svg, img, buttonSize, clickCallback, onLoad) {
    let mButton = svg.append('g')
        .attr("id", id);
    let mSvg = mButton.append('g')
        .attr("filter", FiltersUtil.DROP_SHADOW);
    let mOverlay = mButton.append("rect")
        .classed("button-overlay", true)
        .attr("height", buttonSize)
        .attr("width", buttonSize)
        .attr("opacity", 0)
        .on('pointerdown', (event) => {
            event.stopPropagation();
        }).on('pointerup', (event) => {
            event.stopPropagation();
            clickCallback();
        });

    d3.xml(img).then(data => {
        let width = data.documentElement.getAttribute('width');
        let scale = buttonSize / width;
        mSvg.attr("transform", "scale(" + scale + " " + scale + ")")
        mSvg.node().append(data.documentElement);
        onLoad ? onLoad() : null;
    }).catch(() => {
        // Failed to load XML, we are probably not on the server, getting images instead
        mSvg.append("image")
            .attr("href", img)
            .attr("height", buttonSize)
            .attr("width", buttonSize);
    });

    let mOffsetX = 0;
    let mOffsetY = 0;

    function setPosition(x, y) {
        mButton.attr("transform", "translate(" + (x - buttonSize / 2 + mOffsetX) + "," + (y - buttonSize / 2 + mOffsetY) + ")");
    }

    function isSubButton(offsetX, offsetY) {
        mButton.lower();
        mOffsetX = offsetX;
        mOffsetY = offsetY;
        hide();
    }

    function setActive(active) {
        if (active) {
            mButton.attr("filter", FiltersUtil.OUTLINE)
        } else {
            mButton.attr("filter", FiltersUtil.DROP_SHADOW)
        }
    }

    function hide() {
        mButton.style("display", "none");
    }

    function show() {
        mButton.style("display", "");

    }

    this.setPosition = setPosition;
    this.isSubButton = isSubButton;
    this.hide = hide;
    this.show = show;
    this.setActive = setActive;
}

let SimulationUtil = function () {
    const MAX_RADIUS = Math.max(Size.ELEMENT_NODE_SIZE, Size.STROKE_NODE_SIZE, Size.DIMENTION_NODE_SIZE);

    function drift(d, alpha) {
        let divisionSize = Size.ELEMENT_NODE_SIZE * 10;
        let yTarget = (d.treeLevel + 0.5) * divisionSize;

        let y = d.y - yTarget;
        let l = y;
        let r = d.radius + divisionSize / 3;
        if (l != r) {
            l = (l - r) / l * alpha;
            d.y -= y *= l;
        }
    }

    function cluster(d, alpha, clusters) {
        // https://bl.ocks.org/mbostock/7881887
        d.clusters.forEach(c => {
            const clusterHeart = clusters[c];
            if (clusterHeart === d || c == 0) return;
            let x = d.x - clusterHeart.x;
            let y = d.y - clusterHeart.y;
            let l = Math.sqrt(x * x + y * y);
            let r = d.radius + clusterHeart.radius + 3;
            // if they aren't at min dist
            if (l != r) {
                l = (l - r) / l * alpha;
                d.x -= x *= l;
                d.y -= y *= l;
                clusterHeart.x += x;
                clusterHeart.y += y;
            }

        })
    }

    function collide(alpha, nodes, height, width) {
        // https://bl.ocks.org/mbostock/7882658
        const quadtree = d3.quadtree()
            .x(function (d) { return d.x; })
            .y(function (d) { return d.y; })
            .extent([[0, 0], [width, height]])
            .addAll(nodes);
        return function (d) {
            let r = d.radius + (MAX_RADIUS * 8) + Math.max(Padding.NODE, Padding.CLUSTER),
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function (quad, x1, y1, x2, y2) {
                let data = quad.data;
                if (data && data !== d) {
                    let x = d.x - data.x,
                        y = d.y - data.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + data.radius + (d.clusters && d.clusters.some(c => { data.clusters.includes(c) }) ? Padding.NODE : Padding.CLUSTER);
                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        data.x += x;
                        data.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }

    return {
        drift,
        cluster,
        collide,
    }
}();
let margin = {top: 16, right: 0, bottom: 0, left: 0},
    width = 950 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

let node_radius = 5,
    padding = 1,
    cluster_padding = 10,
    num_nodes = 200;

let svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Foci
let foci = {
    "toppos": { x: 475, y: 150, color: "#cc5efa" },
    "leftpos": { x: 225, y: 300, color: "#29bf10" },
    "rightpos": { x: 725, y: 300, color: "#23cdc7" },
    "bottompos": { x: 475, y: 450, color: "#eb494f" },
};

// Create node objects
let nodes = d3.range(0, num_nodes).map(function(o, i) {
    return {
        id: "node" + i,
        x: foci.toppos.x + Math.random(),
        y: foci.toppos.y + Math.random(),
        radius: node_radius,
        choice: "toppos",
    }
});

// Force-directed layout
let force = d3.layout.force()
    .nodes(nodes)
    .size([width, height])
    .gravity(0)
    .charge(0)
    .friction(.91)
    .on("tick", tick)
    .start();

// Draw circle for each node.
let circle = svg.selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("id", function(d) { return d.id; })
    .attr("class", "node")
    .style("fill", function(d) { return foci[d.choice].color; });

// For smoother initial transition to settling spots.
circle.transition()
    .duration(900)
    .delay(function(d,i) { return i * 5; })
    .attrTween("r", function(d) {
        let i = d3.interpolate(0, d.radius);
        return function(t) { return d.radius = i(t); };
    });


// Run function periodically to make things move.
let timeout;
function timer() {

    // Random place for a node to go
    let choices = d3.keys(foci);
    let foci_index = Math.floor( Math.random() * choices.length );
    let choice = d3.keys(foci)[foci_index];

    // Update random node
    let random_index = Math.floor( Math.random() * nodes.length );
    nodes[random_index].cx = foci[choice].x;
    nodes[random_index].cy = foci[choice].y;
    nodes[random_index].choice = choice;

    force.resume();

    // Run it again in a few seconds.
    timeout = setTimeout(timer, 400);
}

timeout = setTimeout(timer, 400);


//
// Force-directed boiler plate functions
//


function tick(e) {
    circle
        .each(gravity(.051 * e.alpha))
        .each(collide(.5))
        .style("fill", function(d) { return foci[d.choice].color; })
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
}


// Move nodes toward cluster focus.
function gravity(alpha) {
    return function(d) {
        d.y += (foci[d.choice].y - d.y) * alpha;
        d.x += (foci[d.choice].x - d.x) * alpha;
    };
}



// Resolve collisions between nodes.
function collide(alpha) {
    let quadtree = d3.geom.quadtree(nodes);
    return function(d) {
        let r = d.radius + node_radius + Math.max(padding, cluster_padding),
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== d)) {
                let x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + quad.point.radius + (d.choice === quad.point.choice ? padding : cluster_padding);
                if (l < r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
    };
}

;(function() {
let margin = {top: 16, right: 0, bottom: 0, left: 0},
    width = 1000 - margin.left - margin.right,
    height = 900 - margin.top - margin.bottom;

let node_radius = 5,
    padding = 1,
    cluster_padding = 10,
    num_nodes = 200;

 let svg = d3.select("#bubble").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Foci
// TODO: create foci dynamic according to the data provided by the backend
let foci = {
    "peer1": {x: 475, y: 150, color: "#" + (Math.random().toString(16) + "000000").slice(2, 8), slow: false},
    "peer2": {x: 275, y: 150, color: "#" + (Math.random().toString(16) + "000000").slice(2, 8), slow: false},
    "peer3": {x: 75, y: 350, color: "#" + (Math.random().toString(16) + "000000").slice(2, 8), slow: true},
    "peer4": {x: 75, y: 550, color: "#" + (Math.random().toString(16) + "000000").slice(2, 8), slow: false},
    "peer5": {x: 275, y: 750, color: "#" + (Math.random().toString(16) + "000000").slice(2, 8), slow: true},
    "peer6": {x: 675, y: 750, color: "#" + (Math.random().toString(16) + "000000").slice(2, 8), slow: false},
    "peer7": {x: 875, y: 550, color: "#" + (Math.random().toString(16) + "000000").slice(2, 8), slow: false},
    "peer8": {x: 875, y: 350, color: "#" + (Math.random().toString(16) + "000000").slice(2, 8), slow: false},
    "peer9": {x: 675, y: 150, color: "#" + (Math.random().toString(16) + "000000").slice(2, 8), slow: false},
};

// Create node objects
let nodes = d3.range(0, num_nodes).map(function (o, i) {
    return {
        id: "node" + i,
        x: foci[d3.keys(foci)[0]].x + Math.random(),
        y: foci[d3.keys(foci)[0]].y + Math.random(),
        radius: node_radius,
        choice: d3.keys(foci)[0],
        slow: false,
    }
});

// Force-directed layout
let force = d3.layout.force()
    .nodes(nodes)
    .size([width, height])
    .gravity(0) // default to .015
    .charge(0) // default to 0
    .friction(0.92) // default to .96
    .on("tick", tick)
    .start();

// Draw circle for each node.
let circle = svg.selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("id", function (d) {
        return d.id;
    })
    .attr("class", "node")
    .style("fill", function (d) {
        return foci[d.choice].color;
    });

// For smoother initial transition to settling spots.
circle.transition()
    .duration(900)
    .delay(function (d, i) {
        return i * 5;
    })
    .attrTween("r", function (d) {
        let i = d3.interpolate(0, d.radius);
        return function (t) {
            return d.radius = i(t);
        };
    });

function determineSlowConnection(peer1, peer2) {

    let peerDataFromBackend = JSON.parse(localStorage.getItem("peerDataFromBackend"));
    let thisConnectionIsSlow = false;

    peerDataFromBackend.forEach(element => {
        if((element[0] === peer1 && element[1] === peer2) || (element[1] === peer1 && element[0] === peer2))
            if(element[2] > 200) { //...or whatever "slow" means...
                thisConnectionIsSlow = true;
            }
            else
                thisConnectionIsSlow =  false;
    });
    return thisConnectionIsSlow;
}

// Run function periodically to make things move.
let timeout;
let oldChoice;

function timer() {

    // Random place for a node to go
    let choices = d3.keys(foci);
    let foci_index = Math.floor(Math.random() * choices.length);
    let choice = d3.keys(foci)[foci_index];

    let thisConnectionIsSlow = determineSlowConnection(choice, oldChoice ? oldChoice : '');

    // Update random node
    let random_index = Math.floor(Math.random() * nodes.length);
    nodes[random_index].cx = foci[choice].x;
    nodes[random_index].cy = foci[choice].y;
    nodes[random_index].choice = choice;
    nodes[random_index].slow = thisConnectionIsSlow;

    oldChoice = choice;

    force.resume();

    // Run it again in a few seconds.
    timeout = setTimeout(timer, 400);
}

timeout = setTimeout(timer, 400);

function getLegendData() {
    let legendData = [];
    d3.keys(foci).forEach(key => {
        legendData.push([key, foci[key].color, foci[key].slow])
    });
    return legendData;
}

let legend = svg.append('g')
    .attr('transform', `translate(20, 20)`)
    .selectAll('g')
    .data(getLegendData())
    .enter()
    .append('g');

legend.append('circle')
    .attr('fill', d => d[1])
    .attr('r', 5)
    .attr('cx', -10)
    .attr('cy', (d, i) => i * 15 + 50);

legend.append('text')
    .text(d => d[0] + (d[2] ? ' has low latency!' : ''))
    .attr('transform', (d, i) => `translate(10, ${i * 15 + 54})`)
    .attr("class", d => (d[2] ? 'low-latency' : 'regular-latency'));

//
// Force-directed boiler plate functions
//
function tick(e) {
    circle
        .each(gravity(.04, e.alpha))
        .each(collide(.1))
        .style("fill", function (d) {
            return (d.slow ? 'white' : foci[d.choice].color)
        })
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        });
}

// Move nodes toward cluster focus.
function gravity(alpha, eAlpha) {
    return function (d) {
        d.y += (foci[d.choice].y - d.y) * (d.slow ? (0.007 * eAlpha) : (alpha * eAlpha));
        d.x += (foci[d.choice].x - d.x) * (d.slow ? (0.007 * eAlpha) : (alpha * eAlpha));
    };
}

// Resolve collisions between nodes.
function collide(alpha) {
    let quadtree = d3.geom.quadtree(nodes);
    return function (d) {
        let r = d.radius + node_radius + Math.max(padding, cluster_padding),
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;
        quadtree.visit(function (quad, x1, y1, x2, y2) {
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
})();

function drawChord(peerDataFromBackend) {
////////////////////////////////////////////////////////////
//////////////////////// Set-Up ////////////////////////////
////////////////////////////////////////////////////////////

//Mocked data for independent frontend testing
// data = [
//     ['peer1', 'peer2', 232],
//     ['peer1', 'peer3', 323],
//     ['peer1', 'peer4', 324],
//     ['peer1', 'peer5', 123],
//     ['peer1', 'peer6', 434],
//     ['peer1', 'peer7', 135],
//     ['peer1', 'peer8', 335],
//     ['peer1', 'peer9', 332],
//     ['peer2', 'peer1', 232],
//     ['peer2', 'peer3', 34],
//     ['peer2', 'peer4', 21],
//     ['peer2', 'peer5', 67],
//     ['peer2', 'peer6', 11],
//     ['peer2', 'peer7', 12],
//     ['peer2', 'peer8', 67],
//     ['peer2', 'peer9', 69],
//     ['peer3', 'peer1', 323],
//     ['peer3', 'peer2', 34],
//     ['peer3', 'peer4', 89],
//     ['peer3', 'peer5', 46],
//     ['peer3', 'peer6', 22],
//     ['peer3', 'peer7', 31],
//     ['peer3', 'peer8', 48],
//     ['peer3', 'peer9', 22],
//     ['peer4', 'peer1', 324],
//     ['peer4', 'peer2', 21],
//     ['peer4', 'peer3', 89],
//     ['peer4', 'peer5', 57],
//     ['peer4', 'peer6', 62],
//     ['peer4', 'peer7', 46],
//     ['peer4', 'peer8', 98],
//     ['peer4', 'peer9', 97],
//     ['peer5', 'peer1', 123],
//     ['peer5', 'peer2', 67],
//     ['peer5', 'peer3', 46],
//     ['peer5', 'peer4', 57],
//     ['peer5', 'peer6', 34],
//     ['peer5', 'peer7', 77],
//     ['peer5', 'peer8', 45],
//     ['peer5', 'peer9', 43],
//     ['peer6', 'peer1', 434],
//     ['peer6', 'peer2', 11],
//     ['peer6', 'peer3', 22],
//     ['peer6', 'peer4', 62],
//     ['peer6', 'peer5', 34],
//     ['peer6', 'peer7', 43],
//     ['peer6', 'peer8', 78],
//     ['peer6', 'peer9', 35],
//     ['peer7', 'peer1', 135],
//     ['peer7', 'peer2', 12],
//     ['peer7', 'peer3', 31],
//     ['peer7', 'peer4', 46],
//     ['peer7', 'peer5', 77],
//     ['peer7', 'peer6', 43],
//     ['peer7', 'peer8', 63],
//     ['peer7', 'peer9', 23],
//     ['peer8', 'peer1', 335],
//     ['peer8', 'peer2', 67],
//     ['peer8', 'peer3', 48],
//     ['peer8', 'peer4', 98],
//     ['peer8', 'peer5', 45],
//     ['peer8', 'peer6', 78],
//     ['peer8', 'peer7', 63],
//     ['peer8', 'peer9', 25],
//     ['peer9', 'peer1', 332],
//     ['peer9', 'peer2', 69],
//     ['peer9', 'peer3', 22],
//     ['peer9', 'peer4', 97],
//     ['peer9', 'peer5', 43],
//     ['peer9', 'peer6', 35],
//     ['peer9', 'peer7', 23],
//     ['peer9', 'peer8', 25]
// ];

    data = peerDataFromBackend.sort();

    function getUniqIds(data) {
        let flattenAndWithoutNumbers = [].concat(...data).filter((item) => {
            return (parseInt(item) != item); //get rid of last column which contains only numbers, we just need to proceed with the string-id's
        });

        return [...new Set(flattenAndWithoutNumbers)]; //return new array with Set constructor, to avoid dupplicates
    }

    function makeColorsForIds(data) {
        let colors = [];

        getUniqIds(data).forEach(() => {

            colors.push("#" + (Math.random().toString(16) + "000000").slice(2, 8)); //add for each id a generated color and return a new array
        });

        return colors;
    }

    let margin = {left: 20, top: 20, right: 20, bottom: 20},
        width = Math.min(window.innerWidth, 900) - margin.left - margin.right,
        height = Math.min(window.innerWidth, 900) - margin.top - margin.bottom,
        innerRadius = Math.min(width, height) * .39,
        outerRadius = innerRadius * 1.1;

    let names = getUniqIds(data),
        colors = makeColorsForIds(data),
        opacityDefault = 0.8;

    /** example of the generated matrix
     // let matrix = [
     //     [0, 4, 3, 2, 5, 2],
     //     [4, 0, 3, 2, 4, 3],
     //     [3, 3, 0, 2, 3, 3],
     //     [2, 2, 2, 0, 3, 3],
     //     [5, 4, 3, 3, 0, 2],
     //     [2, 3, 3, 3, 2, 0],
     ];*/
    function convertToMatrix(data) {
        let matrix = [];

        getUniqIds(data).sort().forEach((uniqId, uniqIdIndex) => {

                let matrixEntry = [];
                let nextIndexForMatrix = 0;
                for (let i = 0; i < data.length; i++) {

                    let peerPair = data[i]; //the current array of [peer, peer, connectionSpeed]
                    let peerToMatch = peerPair[0];

                    if ((uniqIdIndex == 0 && i == 0)) { // we need this, so the value for the element and itself is always 0.
                        matrixEntry.push(0);
                    }
                    if (peerToMatch === uniqId) {

                        nextIndexForMatrix++;
                        const [, , third] = peerPair;
                        matrixEntry.push(third);
                    }
                    if ((nextIndexForMatrix === uniqIdIndex)) { // we need this, so the value for the element and itself is always 0.
                        matrixEntry.push(0);
                    }

                }
                matrix.push(matrixEntry);
            }
        );
        return matrix;
    }

    let matrix = convertToMatrix(data);


////////////////////////////////////////////////////////////
/////////// Create scale and layout functions //////////////
////////////////////////////////////////////////////////////

    let colorRanges = d3.scale.ordinal()
        .domain(d3.range(names.length))
        .range(colors);

//A "custom" d3 chord function that automatically sorts the order of the chords in such a manner to reduce overlap	
    let chord = customChordLayout()
        .padding(.15)
        .sortChords(d3.descending) //which chord should be shown on top when chords cross. Now the biggest chord is at the bottom
        .matrix(matrix);

    let arc = d3.svg.arc()
        .innerRadius(innerRadius * 1.01)
        .outerRadius(outerRadius);

    let path = d3.svg.chord()
        .radius(innerRadius);

////////////////////////////////////////////////////////////
////////////////////// Create SVG //////////////////////////
////////////////////////////////////////////////////////////

    let svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + (width / 2 + margin.left) + "," + (height / 2 + margin.top) + ")");

////////////////////////////////////////////////////////////
/////////////// Create the gradient fills //////////////////
////////////////////////////////////////////////////////////

//Function to create the id for each chord gradient
    function getGradID(d) {
        return "linkGrad-" + d.source.index + "-" + d.target.index;
    }

//Create the gradients definitions for each chord
    let grads = svg.append("defs").selectAll("linearGradient")
        .data(chord.chords())
        .enter().append("linearGradient")
        .attr("id", getGradID)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", function (d, i) {
            return innerRadius * Math.cos((d.source.endAngle - d.source.startAngle) / 2 + d.source.startAngle - Math.PI / 2);
        })
        .attr("y1", function (d, i) {
            return innerRadius * Math.sin((d.source.endAngle - d.source.startAngle) / 2 + d.source.startAngle - Math.PI / 2);
        })
        .attr("x2", function (d, i) {
            return innerRadius * Math.cos((d.target.endAngle - d.target.startAngle) / 2 + d.target.startAngle - Math.PI / 2);
        })
        .attr("y2", function (d, i) {
            return innerRadius * Math.sin((d.target.endAngle - d.target.startAngle) / 2 + d.target.startAngle - Math.PI / 2);
        })

//Set the starting color (at 0%)
    grads.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", function (d) {
            return colorRanges(d.source.index);
        });

//Set the ending color (at 100%)
    grads.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", function (d) {
            return colorRanges(d.target.index);
        });

////////////////////////////////////////////////////////////
////////////////// Draw outer Arcs /////////////////////////
////////////////////////////////////////////////////////////

    let outerArcs = svg.selectAll("g.group")
        .data(chord.groups)
        .enter().append("g")
        .attr("class", "group")
        .on("mouseover", fade(.1))
        .on("mouseout", fade(opacityDefault));

    outerArcs.append("path")
        .style("fill", function (d) {
            return colorRanges(d.index);
        })
        .attr("d", arc)
        .each(function (d, i) {
            //Search pattern for everything between the start and the first capital L
            let firstArcSection = /(^.+?)L/;

            //Grab everything up to the first Line statement
            let newArc = firstArcSection.exec(d3.select(this).attr("d"))[1];
            //Replace all the comma's so that IE can handle it
            newArc = newArc.replace(/,/g, " ");

            //If the end angle lies beyond a quarter of a circle (90 degrees or pi/2)
            //flip the end and start position
            if (d.endAngle > 90 * Math.PI / 180 & d.startAngle < 270 * Math.PI / 180) {
                let startLoc = /M(.*?)A/,		//Everything between the first capital M and first capital A
                    middleLoc = /A(.*?)0 0 1/,	//Everything between the first capital A and 0 0 1
                    endLoc = /0 0 1 (.*?)$/;	//Everything between the first 0 0 1 and the end of the string (denoted by $)
                //Flip the direction of the arc by switching the start en end point (and sweep flag)
                //of those elements that are below the horizontal line
                let newStart = endLoc.exec(newArc)[1];
                let newEnd = startLoc.exec(newArc)[1];
                let middleSec = middleLoc.exec(newArc)[1];

                //Build up the new arc notation, set the sweep-flag to 0
                newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
            }//if

            //Create a new invisible arc that the text can flow along
            svg.append("path")
                .attr("class", "hiddenArcs")
                .attr("id", "arc" + i)
                .attr("d", newArc)
                .style("fill", "none");
        });

////////////////////////////////////////////////////////////
////////////////// Append Names ////////////////////////////
////////////////////////////////////////////////////////////

//Append the label names on the outside
    outerArcs.append("text")
        .attr("class", "titles")
        .attr("dy", function (d, i) {
            return (d.endAngle > 90 * Math.PI / 180 & d.startAngle < 270 * Math.PI / 180 ? 25 : -16);
        })
        .append("textPath")
        .attr("startOffset", "50%")
        .style("text-anchor", "middle")
        .attr("xlink:href", function (d, i) {
            return "#arc" + i;
        })
        .text(function (d, i) {
            return names[i];
        });

////////////////////////////////////////////////////////////
////////////////// Draw inner chords ///////////////////////
////////////////////////////////////////////////////////////

    svg.selectAll("path.chord")
        .data(chord.chords)
        .enter().append("path")
        .attr("class", "chord")
        .style("fill", function (d) {
            return "url(#" + getGradID(d) + ")";
        })
        .style("opacity", opacityDefault)
        .attr("d", path)
        .on("mouseover", mouseoverChord)
        .on("mouseout", mouseoutChord);

////////////////////////////////////////////////////////////
////////////////// Extra Functions /////////////////////////
////////////////////////////////////////////////////////////

//Returns an event handler for fading a given chord group.
    function fade(opacity) {
        return function (d, i) {
            svg.selectAll("path.chord")
                .filter(function (d) {
                    return d.source.index !== i && d.target.index !== i;
                })
                .transition()
                .style("opacity", opacity);
        };
    }//fade

//Highlight hovered over chord
    function mouseoverChord(d, i) {

        //Decrease opacity to all
        svg.selectAll("path.chord")
            .transition()
            .style("opacity", 0.1);
        //Show hovered over chord with full opacity
        d3.select(this)
            .transition()
            .style("opacity", 1);

        //Define and show the tooltip over the mouse location
        $(this).popover({
            placement: 'auto top',
            container: 'body',
            mouseOffset: 10,
            followMouse: true,
            trigger: 'hover',
            html: true,
            content: function () {
                return "<p style='font-size: 11px; text-align: center;'>the roundtrip between <span style='font-weight:900'>" + names[d.source.index] +
                    "</span> and <span style='font-weight:900'>" + names[d.target.index] +
                    "</span> is currently <span style='font-weight:900'>" + d.source.value + "</span>ms</p>";
            }
        });
        $(this).popover('show');
    }//mouseoverChord

//Bring all chords back to default opacity
    function mouseoutChord(d) {
        //Hide the tooltip
        $('.popover').each(function () {
            $(this).remove();
        });
        //Set opacity back to default for all
        svg.selectAll("path.chord")
            .transition()
            .style("opacity", opacityDefault);
    }

    function reDraw() {

        let ch = viz.ch().data(data)
            .padding(.01)
            .innerRadius(380)
            .outerRadius(400)
            .duration(1000)
            .chordOpacity(0.3)
            .labelPadding(.03)
            .fill(function (d) {
                return idsAndColors[d];
            });

        let width = 1200,
            height = 1100;

        d3.select("#chord").select("svg").remove(); //remove old diagram
        let svg = d3.select("#chord").append("svg").attr("height", height).attr("width", width); //draw new diagram

        svg.append("g").attr("transform", "translate(600,550)").call(ch);
    }

    $
}


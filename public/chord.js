const source = new EventSource('/events');
const chord = document.getElementById('chord');

let data = [];

source.addEventListener('event', function(evt) { //listen to updates from the server
    const receivedData = JSON.parse(evt.data);

    data = JSON.parse(receivedData);

    // console.log(data);
    draw(); //draw the diagram again

    chord.style.animation = 'vibrate 1s linear'; //shake it!
},false);

chord.addEventListener('animationend', () => {
    chord.style.animation = '';
});

//Mocked data for independent frontend testing
// data = [
//     [ 'peer1', 'peer2', 232],
//     [ 'peer1', 'peer3', 323],
//     [ 'peer1', 'peer4', 324],
//     [ 'peer1', 'peer5', 123],
//     [ 'peer1', 'peer6', 434],
//     [ 'peer1', 'peer7', 135],
//     [ 'peer1', 'peer8', 335],
//     [ 'peer1', 'peer9', 332],
//     [ 'peer2', 'peer1', 232],
//     [ 'peer2', 'peer3', 34],
//     [ 'peer2', 'peer4', 21],
//     [ 'peer2', 'peer5', 67],
//     [ 'peer2', 'peer6', 11],
//     [ 'peer2', 'peer7', 12],
//     [ 'peer2', 'peer8', 67],
//     [ 'peer2', 'peer9', 69],
//     [ 'peer3', 'peer1', 553],
//     [ 'peer3', 'peer2', 47],
//     [ 'peer3', 'peer4', 89],
//     [ 'peer3', 'peer5', 46],
//     [ 'peer3', 'peer6', 22],
//     [ 'peer3', 'peer7', 31],
//     [ 'peer3', 'peer8', 48],
//     [ 'peer3', 'peer9', 22],
//     [ 'peer4', 'peer1', 332],
//     [ 'peer4', 'peer2', 62],
//     [ 'peer4', 'peer3', 23],
//     [ 'peer4', 'peer5', 57],
//     [ 'peer4', 'peer6', 62],
//     [ 'peer4', 'peer7', 46],
//     [ 'peer4', 'peer8', 98],
//     [ 'peer4', 'peer9', 97],
//     [ 'peer5', 'peer1', 443],
//     [ 'peer5', 'peer2', 32],
//     [ 'peer5', 'peer3', 34],
//     [ 'peer5', 'peer4', 56],
//     [ 'peer5', 'peer6', 34],
//     [ 'peer5', 'peer7', 77],
//     [ 'peer5', 'peer8', 45],
//     [ 'peer5', 'peer9', 43],
//     [ 'peer6', 'peer1', 765],
//     [ 'peer6', 'peer2', 15],
//     [ 'peer6', 'peer3', 66],
//     [ 'peer6', 'peer4', 44],
//     [ 'peer6', 'peer5', 73],
//     [ 'peer6', 'peer7', 43],
//     [ 'peer6', 'peer8', 78],
//     [ 'peer6', 'peer9', 35],
//     [ 'peer7', 'peer1', 453],
//     [ 'peer7', 'peer2', 34],
//     [ 'peer7', 'peer3', 12],
//     [ 'peer7', 'peer4', 67],
//     [ 'peer7', 'peer5', 85],
//     [ 'peer7', 'peer6', 45],
//     [ 'peer7', 'peer8', 63],
//     [ 'peer7', 'peer9', 23],
//     [ 'peer8', 'peer1', 453],
//     [ 'peer8', 'peer2', 13],
//     [ 'peer8', 'peer3', 43],
//     [ 'peer8', 'peer4', 54],
//     [ 'peer8', 'peer5', 67],
//     [ 'peer8', 'peer6', 74],
//     [ 'peer8', 'peer7', 23],
//     [ 'peer8', 'peer9', 25],
//     [ 'peer9', 'peer1', 544],
//     [ 'peer9', 'peer2', 54],
//     [ 'peer9', 'peer3', 87],
//     [ 'peer9', 'peer4', 94],
//     [ 'peer9', 'peer5', 44],
//     [ 'peer9', 'peer6', 36],
//     [ 'peer9', 'peer7', 23],
//     [ 'peer9', 'peer8', 25]
// ];

function getUniqIds(data) {
    let flattenAndWithoutNumbers =  [].concat(...data).filter((item) => {
        return (parseInt(item) != item); //get rid of last column which contains only numbers, we just need to proceed with the string-id's
    });

    return [...new Set(flattenAndWithoutNumbers)]; //return new array with Set constructor, to avoid dupplicates
}

function makeColorsForIds(data) {
    return getUniqIds(data).reduce((obj, key) => ({ ...obj, [key]: "#" + (Math.random().toString(16) + "000000").slice(2, 8)}), {}) //add for each id a generated color and return a new array
}

function draw() {
    let idsAndColors = makeColorsForIds(data);

    let ch = viz.ch().data(data)
        .padding(.01)
        .innerRadius(380)
        .outerRadius(400)
        .duration(1000)
        .chordOpacity(0.3)
        .labelPadding(.03)
        .fill(function(d) { return idsAndColors[d]; });

    let width = 1200,
        height = 1100;

    d3.select("#chord").select("svg").remove(); //remove old diagram
    let svg = d3.select("#chord").append("svg").attr("height", height).attr("width", width); //draw new diagram

    svg.append("g").attr("transform", "translate(600,550)").call(ch);
}
function getUniqIds(data) {
  let flattenAndWithoutNumbers = [].concat(...data).filter(item => {
    return parseInt(item) != item //get rid of last column which contains only numbers, we just need to proceed with the string-id's
  })

  return [...new Set(flattenAndWithoutNumbers)] //return new array with Set constructor, to avoid dupplicates
}

function generateColors(data) {
  getUniqIds(data).forEach(uniqId => {
    if (!globalColors[uniqId])
      globalColors[uniqId] = {
        color: '#' + (Math.random().toString(16) + '000000').slice(2, 8)
      }
  })
}

function getLegendData(data) {
  let legendData = []
  getUniqIds(data).forEach(uniqId => {
    legendData.push([uniqId, globalColors[uniqId].color])
  })
  return legendData
}

function buildLegend(data, myPeerId) {
  d3.select('#sidenav')
    .select('svg')
    .remove()
  let legendDom = d3.select('#sidenav').append('svg')

  let legend = legendDom
    .append('g')
    .attr('transform', `translate(20, 20)`)
    .selectAll('g')
    .data(getLegendData(data))
    .enter()
    .append('g')

  legend
    .append('circle')
    .attr('fill', d => d[1])
    .attr('r', 10)
    .attr('cx', -10)
    .attr('cy', (d, i) => i * 25 + 8)

  legend
    .append('text')
    .attr('id', d => {
      return 'legend-text-' + d[0]
    })
    .text(d => getLegendEntryText(d, myPeerId))
    .attr('transform', (d, i) => `translate(10, ${i * 25 + 10})`)
    .attr('class', 'regular-latency')
}

function getLegendEntryText(d, myPeerId) {
  let peer = d[0]
  let myPeer = 'peer' + myPeerId
  let peerLabelText = peer.concat(': ', globalIdsWithSpeed[d[0]].speed, 'ms')

  if (peer === myPeer) {
    peerLabelText = peerLabelText.concat(' YOU')
  }
  return peerLabelText
}

function buildIdsWithSpeed(data) {
  let idsWithSpeed = {}

  getUniqIds(data).forEach(uniqId => {
    let speed = 0
    data.forEach(peerPair => {
      if (peerPair[0] === uniqId || peerPair[1] === uniqId) {
        speed = (speed + peerPair[2]) / 2
      }
    })

    idsWithSpeed[uniqId] = { speed: speed }
  })

  globalIdsWithSpeed = idsWithSpeed
}

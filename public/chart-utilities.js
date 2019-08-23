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

function buildLegend(data) {
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
    .text(d => d[0].concat(': ', globalIdsWithSpeed[d[0]].speed, 'ms'))
    .attr('transform', (d, i) => `translate(10, ${i * 25 + 10})`)
    .attr('class', 'regular-latency')
}

function buildIdsWithSpeed(data) {
  let idsWithSpeed = {}

  getUniqIds(data).forEach(uniqId => {
    data.forEach(peerPair => {
      if (peerPair[0] === uniqId) idsWithSpeed[uniqId] = { speed: peerPair[2] }
    })
  })

  globalIdsWithSpeed = idsWithSpeed
}

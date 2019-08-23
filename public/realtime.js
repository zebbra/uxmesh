;(function() {
  let limit = 60,
    duration = 750,
    now = new Date(Date.now() - duration)

  let width = 1250,
    height = 500

  let groups = buildGroups()

  let x = d3.time
    .scale()
    .domain([now - (limit - 10), now - duration])
    .range([0, width])

  let y = d3.scale
    .linear()
    .domain([0, 100])
    .range([height, 0])

  let line = d3.svg
    .line()
    .interpolate('basis')
    .x(function(d, i) {
      return x(now - (limit - 1 - i) * duration)
    })
    .y(function(d) {
      return y(d)
    })

  let svg = d3
    .select('#realtime')
    .append('svg')
    .attr('class', 'chart')
    .attr('width', width)
    .attr('height', height + 50)

  let axis = svg
    .append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(
      (x.axis = d3.svg
        .axis()
        .scale(x)
        .orient('bottom'))
    )

  let paths = svg.append('g')

  for (let name in groups) {
    let group = groups[name]
    group.path = paths
      .append('path')
      .data([group.data])
      .attr('class', name + ' group')
      .style('stroke', group.color)
  }

  function getUniqIds(data) {
    let flattenAndWithoutNumbers = [].concat(...data).filter(item => {
      return parseInt(item) != item //get rid of last column which contains only numbers, we just need to proceed with the string-id's
    })

    return [...new Set(flattenAndWithoutNumbers)] //return new array with Set constructor, to avoid dupplicates
  }

  function buildGroups() {
    let buildedGroups = {}

    let peerDataFromBackend = []
    peerDataFromBackend = JSON.parse(
      localStorage.getItem('peerDataFromBackend')
    )
    let uniqIds = getUniqIds(peerDataFromBackend)

    uniqIds.forEach(peer => {
      peerDataFromBackend.forEach(peerPair => {
        if (peerPair[0] === peer) {
          buildedGroups[peer] = {
            value: 0,
            color: globalColors[peer].color,
            data: d3.range(limit).map(function() {
              return 0
            })
          }
        }
      })
    })
    return buildedGroups
  }

  function tick() {
    now = new Date()

    // Add new values
    for (let name in groups) {
      let group = groups[name]
      let peerDataFromBackend = []
      peerDataFromBackend = JSON.parse(
        localStorage.getItem('peerDataFromBackend')
      )

      peerDataFromBackend.forEach(peerPair => {
        if (peerPair[0] === name) {
          group.data.push(peerPair[2] * 5 + 4 * Math.random()) // push new values to the graph and fancyfy it
        }
      })
      group.path.attr('d', line)
    }

    // function tick() {
    //   now = new Date()
    //
    //   let fancyfyFactor = Math.random()
    //
    //   let peerDataFromBackend = []
    //
    //   peerDataFromBackend = JSON.parse(
    //     localStorage.getItem('peerDataFromBackend')
    //   )
    //
    //   getUniqIds(peerDataFromBackend).forEach(uniqId => {
    //     peerDataFromBackend.forEach(peerPair => {
    //       if (peerPair[0] === uniqId) {
    //         // Add new values
    //         let group = groups[uniqId]
    //         group.data.push(peerPair[2] * fancyfyFactor * 20)
    //         // group.data.push(20 + Math.random() * 50)
    //
    //         group.path.attr('d', line)
    //       }
    //     })
    //   })

    // Shift domain
    x.domain([now - (limit - 2) * duration, now - duration])

    // Slide x-axis left
    axis
      .transition()
      .duration(duration)
      .ease('linear')
      .call(x.axis)

    // Slide paths left
    paths
      .attr('transform', null)
      .transition()
      .duration(duration)
      .ease('linear')
      .attr('transform', 'translate(' + x(now - (limit - 1) * duration) + ')')
      .each('end', tick)

    // Remove oldest data point from each group
    for (let name in groups) {
      let group = groups[name]
      group.data.shift()
    }
  }

  tick()
})()

const _ = require('lodash')
const http = require('http')
const browserify = require('browserify-middleware')
const debug = require('debug')('server')
const express = require('express')
const app = express()
const server = http.Server(app)
const io = require('socket.io')(server)
const pd = require('pretty-data').pd
const emitter = require('./sseEmitter')

//const measured = require('measured')

const DEFAULT_PEER_COUNT = 50
const socklist = {}
const socklist_reverse = {}

const cleanUp = peerID => {
  for (let sock of _.values(socklist)) {
    // also remove all stats from this peer on the other sockets
    debug('found stats on other socks?', sock.stats)
    debug('going to remove stats for peer', peerID, sock.stats[peerID])
    delete sock.stats[peerID]
  }
}
let socketCounter = 0
let report = {}

app.use(express.static('public'))

app.get(
  '/js/bundle.js',
  browserify([
    'debug',
    'lodash',
    'socket.io-client',
    'simple-peer',
    { './client.js': { run: true } }
  ])
)

app.get('/events', emitter.subscribe)

app.get('/stats', (req, res) => {
  res.json(report)
})

server.listen(process.env.PORT || '3001')

// start server polling
serverPolling()

//and the magic goes on...
io.on('connection', socket => {
  socklist[socket.id] = {
    id: ++socketCounter, // _.keys(socklist).length
    active: true,
    stats: {}
  }
  socklist_reverse[socklist[socket.id].id] = socket.id

  debug('Connection with ID:', socklist[socket.id].id)

  const peersToAdvertise = _.chain(io.sockets.connected)
    .values()
    .filter(s => {
      return socket.id !== s.id
    }) // console.log("filter", socklist[socket.id].id, socklist[s.id].id);
    .sampleSize(DEFAULT_PEER_COUNT)
    .value()

  peersToAdvertise.forEach(socket2 => {
    debug(
      'Advertising peer %s to %s',
      socklist[socket.id].id,
      socklist[socket2.id].id
    )
    socket2.emit('peer', {
      peerId: socklist[socket.id].id, //socket.id,
      initiator: true
    })
    socket.emit('peer', {
      peerId: socklist[socket2.id].id, //socket2.id,
      initiator: false
    })
  })

  socket.on('signal', data => {
    const sockId = socklist_reverse[data.peerId]
    const socket2 = io.sockets.connected[sockId]
    if (!socket2) {
      return
    }
    debug(
      'Proxying signal from peer %s to %s',
      socklist[socket.id].id,
      socklist[socket2.id].id
    )

    socket2.emit('signal', {
      signal: data.signal,
      peerId: socklist[socket.id].id, //socket.id
      sourceSocketId: socket2.id,
      sourcePeerId: socklist[socket2.id].id
    })
  })

  socket.on('connected', data => {
    const sockId = socklist_reverse[data.peerId]
    const socket2 = io.sockets.connected[sockId]
    if (!socket2) {
      return
    }
    debug(
      'new webRTC connection',
      's',
      socklist[socket.id].id,
      '-> s',
      socklist[socket2.id].id,
      'info peerId: ',
      data.peerId,
      'connect',
      data.peers[data.peerId].channelName,
      data.peers[data.peerId].localAddress,
      ':',
      data.peers[data.peerId].localPort,
      '->',
      data.peers[data.peerId].remoteAddress,
      ':',
      data.peers[data.peerId].remotePort,
      'initiator',
      data.peers[data.peerId].initiator
    )
  })

  socket.on('report', data => {
    socklist[socket.id].stats[data.peerId] = data
  })

  socket.on('disconnect', data => {
    const peerID = socklist[socket.id].id
    delete socklist_reverse[peerID]

    debug('peer', peerID, 'disconnected', data, 'remove', socket.id)
    cleanUp(peerID)
    delete socklist[socket.id]
    debug('still active', socklist)
  })

  socket.on('peerDown', cleanUp)
})

//server polling to create and publish report data
function serverPolling() {
  try {
    report = {}
    for (let sock of _.values(socklist)) {
      for (let stat of _.values(sock.stats)) {
        report[stat.channel] = report[stat.channel] || {
          channel: stat.channel
        }
        const rep = report[stat.channel]

        if (stat.initiator) {
          rep.from = sock.id
          rep.to = stat.peerId
          rep.speed = stat.speed
          rep.sent = stat.sent
          rep.received = stat.received
          rep.lost = stat.received - stat.sent
          rep.avgRoundtrip = stat.totaltime //... this is correct! I swear!! ;)
        } else {
          rep.relayed = stat.relayed
        }
      }
    }

    let data = [] // [ [peerFrom, peerTo, roundtrip, speed, channel/connectionId, lostPackages, relayed] ]

    _.values(report).forEach(filteredReportElement => {
      let dataEntry1 = [
        'peer' + filteredReportElement.from,
        'peer' + filteredReportElement.to,
        Math.max(1, Math.round(filteredReportElement.avgRoundtrip))
      ] //, reportElement.speed, reportElement.channel, reportElement.lost, reportElement.relayed];
      let dataEntry2 = [
        'peer' + filteredReportElement.to,
        'peer' + filteredReportElement.from,
        Math.max(1, Math.round(filteredReportElement.avgRoundtrip))
      ] //, reportElement.speed, reportElement.channel, reportElement.lost, reportElement.relayed];
      data.push(dataEntry1)
      data.push(dataEntry2)
    })

    data = data.filter(element => {
      return (
        element[0].indexOf('undefined') === -1 &&
        element[1].indexOf('undefined') === -1 &&
        !isNaN(element[2])
      )
    })

    if (!isDatareportConsistent(data)) {
      console.log(
        'data report inonsistent, broken peers in the network. no data will be sent to clients. sanitizing necessary....'
      )
      data = sanitize(data)
    }
    //as we generate the report in this interval, we spread it to our subscribers with the emitter.publish function
    emitter.publish(JSON.stringify(data))
    console.log('stats ', new Date(), '\n===========\n', data, '\n')
  } catch (e) {
    console.log('serverPolling -> ' + e.message)
  }
  //setInterval vs setTimeout: setTimeout executes every "function execution time + given timeout", setInterval executes "every given interval time"
  setTimeout(serverPolling, 5000)
}

function isDatareportConsistent(report) {
  if (report) {
    const amountOfPeers = getAmountOfPeers(report)

    return getExpectedLengthOfReport(amountOfPeers) === report.length
  }
  return false
}

function getAmountOfPeers(report) {
  return getUniqIds(report).length
}

function getExpectedLengthOfReport(amountOfPeers) {
  return amountOfPeers * amountOfPeers - amountOfPeers
}

function getExactAmountAPeerHasToOccure(amountOfPeers) {
  return (amountOfPeers * amountOfPeers - amountOfPeers) / amountOfPeers
}

function getUniqIds(data) {
  let flattenAndWithoutNumbers = getFlatPeers(data)

  return [...new Set(flattenAndWithoutNumbers)] //return new array with Set constructor, to avoid dupplicates
}

function getFlatPeers(data) {
  return [].concat(...data).filter(item => {
    return parseInt(item) != item //get rid of last column which contains only numbers, we just need to proceed with the string-id's
  })
}

function sanitize(report) {
  const uniqIds = getUniqIds(report)
  const exactAmountAPeerHasToOccure = getExactAmountAPeerHasToOccure(
    getAmountOfPeers(report)
  )
  const flatReport = getFlatPeers(report)

  let sanitizedReport = report

  console.log('----- start sanitizing -----')
  console.log('report', report)
  console.log('amountOfPeers', getAmountOfPeers(report))
  console.log('exactAmountAPeerHasToOccure: ', exactAmountAPeerHasToOccure)

  uniqIds.forEach(peer => {
    const peerOccurences =
      _.sumBy(flatReport, flatPeer => {
        if (flatPeer === peer) return 1
        else return 0
      }) / 2 // we check for 1/2 because, each peer appears twice in the report

    console.log('occurences for ', peer, ':', peerOccurences)

    if (peerOccurences !== exactAmountAPeerHasToOccure) {
      sanitizedReport = sanitizedReport.filter(peerPair => {
        if (!(peer === peerPair[0] || peer === peerPair[1])) {
          return true
        }
        console.log('deleted, bcause invalid: ', peer)
        return false
      })
    }
  })

  console.log('sanitized report', sanitizedReport)
  console.log('----- end sanitizing -----')

  return sanitizedReport
}

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
  //console.log(io.sockets.connected)
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
      peerId: socklist[socket.id].id //socket.id
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
        Math.max(
          1,
          Math.round(filteredReportElement.avgRoundtrip + 10 * Math.random())
        )
      ] //, reportElement.speed, reportElement.channel, reportElement.lost, reportElement.relayed];
      let dataEntry2 = [
        'peer' + filteredReportElement.to,
        'peer' + filteredReportElement.from,
        Math.max(
          1,
          Math.round(filteredReportElement.avgRoundtrip + 10 * Math.random())
        )
      ] //, reportElement.speed, reportElement.channel, reportElement.lost, reportElement.relayed];
      data.push(dataEntry1)
      data.push(dataEntry2)
    })

    //mocked Data for testing
    // let data = [
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
    //     ['peer3', 'peer1', 553],
    //     ['peer3', 'peer2', 47],
    //     ['peer3', 'peer4', 89],
    //     ['peer3', 'peer5', 46],
    //     ['peer3', 'peer6', 22],
    //     ['peer3', 'peer7', 31],
    //     ['peer3', 'peer8', 48],
    //     ['peer3', 'peer9', 22],
    //     ['peer4', 'peer1', 332],
    //     ['peer4', 'peer2', 62],
    //     ['peer4', 'peer3', 23],
    //     ['peer4', 'peer5', 57],
    //     ['peer4', 'peer6', 62],
    //     ['peer4', 'peer7', 46],
    //     ['peer4', 'peer8', 98],
    //     ['peer4', 'peer9', 97],
    //     ['peer5', 'peer1', 443],
    //     ['peer5', 'peer2', 32],
    //     ['peer5', 'peer3', 34],
    //     ['peer5', 'peer4', 56],
    //     ['peer5', 'peer6', 34],
    //     ['peer5', 'peer7', 77],
    //     ['peer5', 'peer8', 45],
    //     ['peer5', 'peer9', 43],
    //     ['peer6', 'peer1', 765],
    //     ['peer6', 'peer2', 15],
    //     ['peer6', 'peer3', 66],
    //     ['peer6', 'peer4', 44],
    //     ['peer6', 'peer5', 73],
    //     ['peer6', 'peer7', 43],
    //     ['peer6', 'peer8', 78],
    //     ['peer6', 'peer9', 35],
    //     ['peer7', 'peer1', 453],
    //     ['peer7', 'peer2', 34],
    //     ['peer7', 'peer3', 12],
    //     ['peer7', 'peer4', 67],
    //     ['peer7', 'peer5', 85],
    //     ['peer7', 'peer6', 45],
    //     ['peer7', 'peer8', 63],
    //     ['peer7', 'peer9', 23],
    //     ['peer8', 'peer1', 453],
    //     ['peer8', 'peer2', 13],
    //     ['peer8', 'peer3', 43],
    //     ['peer8', 'peer4', 54],
    //     ['peer8', 'peer5', 67],
    //     ['peer8', 'peer6', 74],
    //     ['peer8', 'peer7', 23],
    //     ['peer8', 'peer9', 25],
    //     ['peer9', 'peer1', 544],
    //     ['peer9', 'peer2', 54],
    //     ['peer9', 'peer3', 87],
    //     ['peer9', 'peer4', 94],
    //     ['peer9', 'peer5', 44],
    //     ['peer9', 'peer6', 36],
    //     ['peer9', 'peer7', 23],
    //     ['peer9', 'peer8', 25]
    // ];

    //as we generate the report in this interval, we spread it to our subscribers with the emitter.publish function

    data = data.filter(element => {
      return (
        element[0].indexOf('undefined') === -1 &&
        element[1].indexOf('undefined') === -1 &&
        !isNaN(element[2])
      )
    })
    emitter.publish(JSON.stringify(data))
    console.log('stats ', new Date(), '\n===========\n', data, '\n')
  } catch (e) {
    console.log('serverPolling -> ' + e.message)
  }
  //setInterval vs setTimeout: setTimeout executes every "function execution time + given timeout", setInterval executes "every given interval time"
  setTimeout(serverPolling, 5000)
}

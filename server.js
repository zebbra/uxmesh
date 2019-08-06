const _ = require('lodash');
const http = require('http');
const browserify = require('browserify-middleware');
const debug = require('debug')('server');
const express =require('express');
const app = express();
const server = http.Server(app);
const io = require('socket.io')(server);
const pd = require('pretty-data').pd

const DEFAULT_PEER_COUNT = 50;
app.use(express.static("public"));
app.get('/js/bundle.js', browserify(['debug', 'lodash', 'socket.io-client', 'simple-peer', {'./client.js': {run: true}}]));


const socklist = {}
const socklist_reverse = {}
let socketCounter = 0
let report = {}


// does not work
// app.on('listen', () => {
//   debug("server now listening", arguments)
// })

const cleanUp = (peerID) => {
  for (let sock of _.values(socklist)) {
    // also remove all stats from this peer on the other sockets
    debug("found stats on other socks?", sock.stats)
    debug("going to remove stats for peer", peerID, sock.stats[peerID])
    delete sock.stats[peerID]
  }
}

io.on('connection', socket => {

  socklist[socket.id] = {
    id: ++socketCounter, // _.keys(socklist).length
    active: true,
    stats: {}
  }
  socklist_reverse[socklist[socket.id].id] = socket.id

  debug('Connection with ID:',socklist[socket.id].id);
  //console.log(io.sockets.connected)
  const peersToAdvertise = _.chain(io.sockets.connected)
    .values()
    .filter((s) => { return(socket.id != s.id)}) // console.log("filter", socklist[socket.id].id, socklist[s.id].id); 
    .sampleSize(DEFAULT_PEER_COUNT)
    .value();
  //console.log("bla", peersToAdvertise)
  //debug('advertising peers', _.map(peersToAdvertise, 'id'));
  peersToAdvertise.forEach(socket2 => {
    //debug('Advertising peer %s to %s', socket.id, socket2.id);
    debug('Advertising peer %s to %s', socklist[socket.id].id, socklist[socket2.id].id);

    socket2.emit('peer', {
      peerId: socklist[socket.id].id, //socket.id,
      initiator: true
    });
    socket.emit('peer', {
      peerId: socklist[socket2.id].id, //socket2.id,
      initiator: false
    });
  });

  socket.on('signal', data => {
    const sockId = socklist_reverse[data.peerId]
    const socket2 = io.sockets.connected[sockId];
    if (!socket2) { return; }
    //debug('Proxying signal from peer %s to %s', socket.id, socket2.id);
    debug('Proxying signal from peer %s to %s', socklist[socket.id].id, socklist[socket2.id].id);

    socket2.emit('signal', {
      signal: data.signal,
      peerId: socklist[socket.id].id, //socket.id
    });
  });

  socket.on('connected', data => {
    const sockId = socklist_reverse[data.peerId]
    const socket2 = io.sockets.connected[sockId];
    if (!socket2) { return; }
    //debug("new webrtc connection details", data)
    debug("new webRTC connection",
      "s", socklist[socket.id].id, "-> s", socklist[socket2.id].id,
      "info peerId: ", data.peerId,
      "connect", data.peers[data.peerId].channelName,
      data.peers[data.peerId].localAddress, ":",
      data.peers[data.peerId].localPort, "->",
      data.peers[data.peerId].remoteAddress, ":",
      data.peers[data.peerId].remotePort,
      "initiator", data.peers[data.peerId].initiator
    )
  });

  socket.on('report', data => {
    socklist[socket.id].stats[data.peerId] = data
  })

  socket.on('disconnect', data => {

    //io.sockets.connected[socket.id].disconnect()
    const peerID = socklist[socket.id].id
    delete socklist_reverse[peerID]

    debug("peer", peerID, "disconnected", data, "remove", socket.id)
    cleanUp(peerID)
    delete socklist[socket.id]
    debug("still active", socklist)
  })

  socket.on('peerDown', cleanUp)
});


setInterval(() => {
  /*
{
  "UUmOzpXD0wR7RJZvAAAA": {
    "id": 1,
    "active": true,
    "stats": {
      "2": {
        "peerId": 2,
        "speed": "143 B",
        "sent": 74,
        "received": 76,
        "relayed": 0
      }
    }
  },
  "xlXZhpxZcOdLJysgAAAB": {
    "id": 2,
    "active": true,
    "stats": {
      "1": {
        "peerId": 1,
        "speed": "143 B",
        "sent": 0,
        "received": 0,
        "relayed": 76
      }
    }
  }
}
  */
 report = {}
  debug("debug,keys", _.keys(socklist))
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
        rep.lost = stat.received-stat.sent
      } else {
        rep.relayed = stat.relayed
      }
    }
  }
  console.log("stats ", new Date(), "\n===========\n", _.values(report), "\n")
}, 2000)
server.listen(process.env.PORT || '3000');

app.get('/stats', (req, res) => {
  res.json(report)
})

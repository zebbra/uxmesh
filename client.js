console.log("type in console: localStorage.debug = 'client'")
require('debug').enable('client')

// keep an eye on: https://github.com/webrtc/adapter

const DataChannel = require('./datachannel')
const io = require('socket.io-client');
const debug = require('debug')('client');
const socket = io.connect('http://127.0.0.1:3000'); // FIXME
// const speed = require('speedometer')();
// const prettierBytes = require('prettier-bytes');
// const _ = require('lodash')
// const peers = {};
// const useTrickle = false; // true is better, however false might be easier to debug
// let wrtc = null
let datachannels = []


// debug.log = console.log.bind(console);

// const report = () => {
//   if(datachannels.length > 0) {
//     for(let dc of datachannels) {
//       socket.emit('report', dc.getReport())
//     }
//   }
//  }
// setInterval(report, 2000)

socket.on('connect', () => {
  debug('Connected to signalling server, Socket ID: %s', socket.id);
  const report = () => {
    if(datachannels.length > 0) {

      datachannels = datachannels.filter((dc) => {
        if(dc.active == true) {
          socket.emit('report', dc.getReport())
          return true
        } else {
          debug('remove dc', dc, 'from datachannel list')
          socket.emit('peerDown', dc.peerId)
          dc = null
          return false
        }
      })

      // for(let dc of datachannels) {
      //   if(dc.active == true)
      //   socket.emit('report', dc.getReport())
      // }
    }
  }
  setInterval(report, 2000)
});

socket.on('disconnect', () => {
  debug('websocket closed, killing peers')
  for(let dc of datachannels) {
    dc.shutdown()
  }
  datachannels = []
})

socket.on('error', (err) => {
  debug('websocket error', err)
})


socket.on('peer', (data) => {
  debug('client onPeer', data)
  let dc = new DataChannel(data, socket)
  datachannels.push(dc)
  // let checkId

  // const stillAlive = () => {
  //   if (dc.active == false) {
  //     dc = null
  //     debug("stillAlive is false, set to null")
  //     clearInterval(checkId)
  //   }
  // }
  // checkId = setInterval(stillAlive, 100)
})

socket.on('signal', (data) => {
  for(let dc of datachannels) {
    dc.socketSignal(data)
  }
})

/*data => {
  debug('onPeer')
  const peerId = data.peerId;
  const config = {
    initiator: data.initiator,
    trickle: useTrickle,
    //channelName: 'network-test',
    channelConfig: {
      ordered: false, // not sure which to use: https://w3c.github.io/webrtc-pc/#dom-rtcdatachannel
      reliable: false,
      maxRetransmits: 0
      //maxPacketLifeTime: 0 // segfault?
    },
    objectMode: false
  }
  if (isNode()) {
    config.wrtc = wrtc;
  } 
  const peer = new Peer(config)
  let stats = {
    sent: 0,
    received: 0,
    relayed: 0
  }

  setInterval(()=> {
    debug('peer', peerId, 'speed', prettierBytes(speed()), "stats", stats, stats.received/stats.sent*100);
    stats = {
      sent: 0,
      received: 0,
      relayed: 0
    }
  }, 2000)

  const report = () => {
    // peer.getStats(((err, reports) => {
    //   if(isNode()) {
    //     reports = _.filter(reports, {type: 'googCandidatePair', googActiveConnection: 'true'})
    //   } else {
    //     console.log("stats", reports)
    //   }
    //   debug('getStats', err, reports)
    // }))
  }
  const getStatsInterval = setInterval(report, 10000)

  debug('Peer available for connection discovered from signalling server, Peer ID: %s', peerId);

  socket.on('signal', data => {
    if (data.peerId == peerId) {
      debug('Received signalling data', data, 'from Peer ID:', peerId);
      peer.signal(data.signal);
    }
  });

  peer.on('signal', data => {
    debug('Advertising signalling data', data, 'to Peer ID:', peerId);
    let event = {
      signal: data,
      peerId: peerId
    }
    socket.emit('signal', event)
  });
  peer.on('error', e => {
    debug('Error sending connection to peer %s:', peerId, e);
  });
  peer.on('connect', () => {
    debug('Peer connection established', "initiator", config.initiator) //"channel", peer._channel);
    const intervalId = setInterval(() => {
      if (config.initiator) {
        for (let i of Array(increase).keys()) {
          try {
            peer.send("1234567890".repeat(14)) // 100 seems to be a good max
          } catch (err) {
            debug("peer.send error", err, "shutdown")
            clearInterval(intervalId)
            break
          }
          stats.sent++
        }
      }
    }, 1)
    peer.send("hey peer");
    // const knownPeers =  _.chain(peers).values().map(peer => ({
    //   id: peer.id,
    //   channelName: peer.channelName,
    //   localAddress: peer.localAddress
    // })).value()
    const knownPeers = {}
    for (let [id, peer] of Object.entries(peers)) {
      knownPeers[id] = {
        channelName: peer.channelName,
        localAddress: peer.localAddress,
        localPort: peer.localPort,
        remoteAddress: peer.remoteAddress,
        remotePort: peer.remotePort
      }
    }
    debug("sending connected peers", knownPeers)
    socket.emit('connected', {socketId: socket.id, peerId: peerId, peers: knownPeers})
  });
  peer.on('data', data => {
    const who = config.initiator ? 'initiator': 'relay'
    //debug(who + ' recieved data from peer:', data);
    speed(data.length)
    // send em back
    if (!config.initiator) {
      try {
        peer.send("" + data)
        stats.relayed++
      } catch (err) {
        debug("peer.send error", err, "shutdown")
      }
    } else {
      stats.received++
    }
  });
  peer.on('close', data => {
    console.log("close???")
    clearInterval(getStatsInterval)
  })
  peer.on('*', event => {console.log("debug *", event)})
  peers[peerId] = peer;
});
*/

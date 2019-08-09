const Peer = require('simple-peer');
const debug = require('debug')('dc');
const _ = require('lodash')
const speed = require('speedometer')();
const prettierBytes = require('prettier-bytes');
const peers = {};
const useTrickle = false; // true is better, however false might be easier to debug
let wrtc = null

require('debug').enable('dc')


let increase = 1 // max 50 seems to be good
const SLEEPTIME = 20-1

isNode = () => (process.title == "node")

if (isNode()) {
  wrtc = require('wrtc')
  debug('init on node')
  process.on('unhandledRejection', error => {
    // Will print "unhandledRejection err is not defined"
    console.log('unhandledRejection', error.stack);
    //throw(error)
    process.exit(0)
  });
  
} else {
  debug('init in browser')
}


module.exports = class DataChannel {

  constructor (params, socket) {
    debug('onPeer')
    this.socket = socket
    this.peerId = params.peerId;
    this.active = true
    this._initPeer(params)
    //this._setupReports()
    this._theRest()
  }

  _initPeer (params) {
    this.config = {
      initiator: params.initiator,
      trickle: useTrickle,
      //channelName: process.argv[2],
      channelConfig: {
        ordered: false, // not sure which to use: https://w3c.github.io/webrtc-pc/#dom-rtcdatachannel
        reliable: false,
        maxRetransmits: 0
        //maxPacketLifeTime: 0 // segfault?
      },
      objectMode: false
    }
    if (isNode()) {
      this.config.wrtc = wrtc;
    } 
    this.peer = new Peer(this.config)
    this._initStats()
  }

  _initStats () {
    this.stats = this.stats || {}
    this.stats.sent = 0
    this.stats.received = 0
    this.stats.relayed =  0
  }

  getReport() {
    const report = {
      peerId: this.peerId,
      speed: prettierBytes(speed()),
      sent: this.stats.sent,
      received: this.stats.received,
      relayed: this.stats.relayed,
      channel: this.peer && this.peer.channelName || "NA",
      initiator: this.config.initiator
    }

    debug("stats1", report)
    this._initStats()
    debug("stats2", report)

    return report
  }
  // _setupReports () {

  //   this.intervalSpeed = setInterval(() => {
  //     debug('peer', this.peerId, 'speed', prettierBytes(speed()), "stats", this.stats, this.stats.received/this.stats.sent*100);
  //     this._initStats()
  //   }, 2000)

    // const report = () => {
    //   // peer.getStats(((err, reports) => {
    //   //   if(isNode()) {
    //   //     reports = _.filter(reports, {type: 'googCandidatePair', googActiveConnection: 'true'})
    //   //   } else {
    //   //     console.log("stats", reports)
    //   //   }
    //   //   debug('getStats', err, reports)
    //   // }))
    // }
    // const getStatsInterval = setInterval(report, 10000)

  //}

  socketSignal (data) {
    if (data.peerId == this.peerId) {
      debug('Received signalling data', data, 'from Peer ID:', this.peerId);
      this.peer.signal(data.signal);
    } else {
      // debug("ignore signal from ", data.peerId)
    }
  }

  _theRest () {
    debug('Peer available for connection discovered from signalling server, Peer ID: %s', this.peerId);

    // this.socket.on('signal', data => {
    //   if (data.peerId == this.peerId) {
    //     debug('Received signalling data', data, 'from Peer ID:', this.peerId);
    //     this.peer.signal(data.signal);
    //   } else {
    //     // debug("ignore signal from ", data.peerId)
    //   }
    // });

    this.peer.on('signal', data => {
      debug('Advertising signalling data', data, 'to Peer ID:', this.peerId);
      let event = {
        signal: data,
        peerId: this.peerId
      }
      this.socket.emit('signal', event)
    });
    this.peer.on('error', e => {
      debug('Error sending connection to peer %s:', this.peerId, e);
    });
    this.peer.on('connect', () => {
      debug('Peer connection established', "initiator", this.config.initiator) //"channel", peer._channel);
      this.intervalSend = setInterval(() => {
        if (this.config.initiator) {
          //for (let i of Array(increase).keys()) {
            try {
              this.peer.send("x".repeat(143)) // more or less RTP
            } catch (err) {
              debug("peer.send error", err, "shutdown")
              this.shutdown()
              //break
            }
            this.stats.sent++
          //}
        }
      }, SLEEPTIME)
      //this.peer.send("hey peer");
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
      this.socket.emit('connected', {socketId: this.socket.id, peerId: this.peerId, peers: knownPeers})
    });
    this.peer.on('data', data => {
      const who = this.config.initiator ? 'initiator': 'relay'
      //debug(who + ' recieved data from peer:', data);
      speed(data.length)
      // send em back
      if (!this.config.initiator) {
        try {
          this.peer.send("" + data)
          this.stats.relayed++
        } catch (err) {
          debug("peer.send error", err, "shutdown")
        }
      } else {
        this.stats.received++
      }
    });
    this.peer.on('close', data => {
      console.log("close???")
      this.shutdown()
    })
    peers[this.peerId] = this.peer;
  }

  shutdown () {
    debug("going to kill myself", this.peerId)
    //clearInterval(this.intervalSpeed)
    clearInterval(this.intervalSend)
    // this.socket. removeEventListener() ??
    this.peer = null
    this.socket = null
    this.active = false
  }
}

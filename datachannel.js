const Peer = require('simple-peer')
const debug = require('debug')('dc')
const _ = require('lodash')
const speed = require('speedometer')()
const prettierBytes = require('prettier-bytes')
const peers = {}
const useTrickle = false // true is better, however false might be easier to debug
let wrtc = null

require('debug').enable('dc')

let increase = 1 // max 50 seems to be good
const SLEEPTIME = 20 - 1

isNode = () => process.title === 'node'

if (isNode()) {
  wrtc = require('wrtc')
  debug('init on node')
  process.on('unhandledRejection', error => {
    // Will print "unhandledRejection err is not defined"
    console.log('unhandledRejection', error.stack)
    //throw(error)
    process.exit(0)
  })
} else {
  debug('init in browser')
}

module.exports = class DataChannel {
  constructor(params, socket) {
    debug('onPeer')
    this.socket = socket
    this.peerId = params.peerId
    this.active = true
    this._initPeer(params)
    this._theRest()
  }

  _initPeer(params) {
    this.config = {
      initiator: params.initiator,
      trickle: useTrickle,
      //channelName: process.argv[3],
      channelConfig: {
        ordered: false, // not sure which to use: https://w3c.github.io/webrtc-pc/#dom-rtcdatachannel
        reliable: false,
        maxRetransmits: 0
        //maxPacketLifeTime: 0 // segfault?
      },
      objectMode: false
    }
    if (isNode()) {
      this.config.wrtc = wrtc
    }
    this.peer = new Peer(this.config)
    this._initStats()
  }

  _initStats() {
    this.stats = this.stats || {}
    this.stats.sent = 0
    this.stats.received = 0
    this.stats.relayed = 0
    this.stats.totaltime = 0
  }

  getReport() {
    const report = {
      peerId: this.peerId,
      speed: speed(),
      sent: this.stats.sent,
      received: this.stats.received,
      relayed: this.stats.relayed,
      channel: (this.peer && this.peer.channelName) || 'NA',
      initiator: this.config.initiator,
      totaltime: this.stats.totaltime
    }

    debug('stats1', report)
    this._initStats()
    debug('stats2', report)

    return report
  }

  socketSignal(data) {
    if (data.peerId === this.peerId) {
      debug('Received signalling data', data, 'from Peer ID:', this.peerId)
      this.peer.signal(data.signal)
    } else {
    }
  }

  _theRest() {
    debug(
      'Peer available for connection discovered from signalling server, Peer ID: %s',
      this.peerId
    )

    this.peer.on('signal', data => {
      console.log(
        'Advertising signalling data',
        data,
        'to Peer ID:',
        this.peerId
      )
      let event = {
        signal: data,
        peerId: this.peerId
      }
      this.socket.emit('signal', event, data => {})
    })
    this.peer.on('error', e => {
      debug('Error sending connection to peer %s:', this.peerId, e)
    })
    this.peer.on('connect', () => {
      debug('Peer connection established', 'initiator', this.config.initiator) //"channel", peer._channel);
      this.intervalSend = setInterval(() => {
        if (this.config.initiator) {
          try {
            let starttime = new Date().getTime()
            const payload = {
              starttime: starttime,
              x: 'x'.repeat(100)
            }
            this.peer.send(JSON.stringify(payload)) // more or less RTP
          } catch (err) {
            debug('peer.send error', err, 'shutdown')
            this.shutdown()
            //break
          }
          this.stats.sent++
        }
      }, SLEEPTIME)

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
      debug('sending connected peers', knownPeers)
      this.socket.emit('connected', {
        socketId: this.socket.id,
        peerId: this.peerId,
        peers: knownPeers
      })
    })
    this.peer.on('data', data => {
      speed(data.length)
      // send em back
      if (!this.config.initiator) {
        try {
          this.peer.send('' + data)
          this.stats.relayed++
        } catch (err) {
          debug('peer.send error', err, 'shutdown')
        }
      } else {
        const payload = JSON.parse(data)
        let starttime = payload.starttime
        let endtime = new Date().getTime()

        if (!this.stats.totaltime || this.stats.totaltime === 0) {
          this.stats.totaltime = endtime - starttime
        } else {
          this.stats.totaltime =
            (endtime - starttime + this.stats.totaltime * 20) / 21
        }

        this.stats.received++
      }
    })
    this.peer.on('close', data => {
      console.log('close???')
      this.shutdown()
    })
    this.peer.on('error', error => {
      console.log('error on peer connection', error)
      this.shutdown()
    })
    peers[this.peerId] = this.peer
  }

  shutdown() {
    debug('going to kill myself', this.peerId)
    clearInterval(this.intervalSend)
    this.peer = null
    this.socket = null
    this.active = false
  }
}

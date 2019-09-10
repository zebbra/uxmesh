console.log("type in console: localStorage.debug = 'client'")
require('debug').enable('client')

// keep an eye on: https://github.com/webrtc/adapter
const DataChannel = require('./datachannel')
const io = require('socket.io-client')
const debug = require('debug')('client')
const socket = io.connect(
  process.argv[2] || 'http://localhost:3001' || 'https://uxmesh.k8s.zebbra.ch/'
)
let datachannels = []

this.myPeerId = undefined

socket.on('connect', () => {
  debug('Connected to signalling server, Socket ID: %s', socket.id)
  const report = () => {
    if (datachannels.length > 0) {
      datachannels = datachannels.filter(dc => {
        if (dc.active === true) {
          socket.emit('report', dc.getReport())
          return true
        } else {
          debug('remove dc', dc, 'from datachannel list')
          socket.emit('peerDown', dc.peerId)
          dc = null
          return false
        }
      })
    }
  }
  setInterval(report, 2000)
})

socket.on('disconnect', () => {
  debug('websocket closed, killing peers')
  for (let dc of datachannels) {
    dc.shutdown()
  }
  datachannels = []
})

socket.on('error', err => {
  debug('websocket error', err)
})

socket.on('peer', data => {
  debug('client onPeer', data)

  let dc = new DataChannel(data, socket)
  datachannels.push(dc)
})

socket.on('signal', data => {
  storeMyPeerId(data.sourcePeerId)

  for (let dc of datachannels) {
    dc.socketSignal(data)
  }
})

function storeMyPeerId(myPeerId) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('myPeerId', myPeerId)
    this.myPeerId = myPeerId
  } else this.myPeerId = myPeerId
}

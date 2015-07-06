var Peer = require('simple-peer');
var io = require('socket.io-client');
var debug = require('debug')('client');
var socket = io.connect();
var peers = {};

socket.on('connect', function() {
  debug('Connected to signalling server, Peer ID: %s', socket.id);
});
socket.on('receivePeerSignal', function(data) {
  var peerId = data.peerId;
  var peer = peers[peerId] || new Peer({ trickle: true });

  debug('Received peer signalling data', data.signallingData, 'from Peer ID:', peerId);
  peer.signal(data.signallingData);

  peer.on('signal', function(signallingData) {
    debug('Responding with signalling data', signallingData, 'to Peer ID:', peerId);
    socket.emit('signalAvailable', {
      signallingData: signallingData,
      peerId: peerId
    });
  });
  peer.on('connect', function() {
    peer.send("what's up peer?");
  });
  peer.on('error', function(e) {
    debug('Error receiving connection from peer %s:', peerId, e);
  });
  peer.on('data', function(data) {
    debug('got data from remote peer %s:', peerId, data);
  });
  peers[peerId] = peer;
});

socket.on('peerAvailable', function(data) {
  var peerId = data.peerId;
  var peer = new Peer({ initiator: true, trickle: true });

  debug('Peer available for connection discovered from signalling server, Peer ID: %s', peerId);
  peer.on('signal', function(signallingData) {
    debug('Advertised signalling data', signallingData, 'to Peer ID:', peerId);
    socket.emit('signalAvailable', {
      signallingData: signallingData,
      peerId: peerId
    });
  });
  peer.on('error', function(e) {
    debug('Error sending connection to peer %s:', peerId, e);
  });
  peer.on('connect', function() {
    peer.send("hey peer");
  });
  peers[peerId] = peer;
});

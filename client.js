var Peer = require('simple-peer');
var io = require('socket.io-client');
var debug = require('debug')('client');
var socket = io.connect();
var peers = {};
var useTrickle = true;

socket.on('connect', function() {
  debug('Connected to signalling server, Peer ID: %s', socket.id);
});

socket.on('peer', function(data) {
  var peerId = data.peerId;
  var peer = new Peer({ initiator: data.initiator, trickle: useTrickle });

  debug('Peer available for connection discovered from signalling server, Peer ID: %s', peerId);

  socket.on('signal', function(data) {
    if (data.peerId == peerId) {
      debug('Received signalling data', data, 'from Peer ID:', peerId);
      peer.signal(data.signal);
    }
  });

  peer.on('signal', function(data) {
    debug('Advertising signalling data', data, 'to Peer ID:', peerId);
    socket.emit('signal', {
      signal: data,
      peerId: peerId
    });
  });
  peer.on('error', function(e) {
    debug('Error sending connection to peer %s:', peerId, e);
  });
  peer.on('connect', function() {
    debug('Peer connection established');
    peer.send("hey peer");
  });
  peer.on('data', function(data) {
    debug('Recieved data from peer:', data);
  });
  peers[peerId] = peer;
});

var _ = require('lodash');
var http = require('http');
var debug = require('debug')('server');
var server = http.createServer();
var io = require('socket.io')(server);

io.on('connection', function (socket) {
  debug('CONNECTED', socket.id);
  var peersToAdvertise = _.chain(io.sockets.connected)
    .values()
    .without(socket)
    .sample(DEFAULT_PEER_COUNT)
    .value();
  debug('advertising peers', _.map(peersToAdvertise, 'id'));
  peersToAdvertise.forEach(function(socket2) {
    debug('Advertising peer %s to %s', socket.id, socket2.id);
    socket2.emit('peerAvailable', {
      peerId: socket.id,
      publicKey: null // TODO
    });
  });

  socket.on('signalAvailable', function(data) {
    var socket2 = io.sockets.connected[data.peerId];
    if (!socket2) { return; }
    debug('Proxying signal from peer %s to %s', socket.id, socket2.id);

    socket2.emit('receivePeerSignal', {
      signallingData: data.signallingData,
      peerId: socket.id
    });
  });
});

server.listen(process.env.PORT || '3000');
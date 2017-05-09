const fs = require('fs-extra');
const Path = require('path');
const IO = require('socket.io');
const ss = require('socket.io-stream');
const proximify = require('proximify');
const secret = require('../utils/secret');
const debug = require('debug')('socket-file-sync');

module.exports = server;

async function server(config) {
  const io = IO(config.port);

  io.on('connection', socket => onConnection(proximify(socket), config));

  console.log('Listening for connections');
}

async function onConnection(socket, config) {
  console.log('New socket connection.');
  console.log('Waiting for authentication...');
  const authData = await socket.onceAsync('auth');
  if (!authData || !authData.secret) {
    console.warn('Did not receive secret');
    socket.emit('auth', { error: 'Did not send secret' });
  }
  if (authData.secret === config.secret) {
    socket.emit('auth', { success: true });
    console.log('Authenticated!');
  } else {
    socket.emit('auth', { error: 'Secret did not match' });
    console.error('Authentication failed.');
    return;
  }

  const serverDir = await socket.onceAsync('serverDir');
  console.log('Checking', serverDir + '...');
  await fs.access(serverDir);
  console.log('serverDir exists');
  console.log('Waiting to receive files...');

  socket.on('sending-file', async relative => {
    console.log('Receiving', relative + '...');
    const path = Path.normalize(Path.join(serverDir, relative));
    await fs.ensureFile(path);
    const stream = proximify(ss.createStream());
    ss(socket).emit('file', stream);
    // stream.pipe(fs.createWriteStream(path));
    stream.pipe(process.stdout);
    await stream.onceAsync('end');
    console.log('Received', relative);
  });
}

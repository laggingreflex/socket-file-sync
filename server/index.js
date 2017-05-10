const fs = require('fs-extra');
const Path = require('path');
const http = require('http');
const IO = require('socket.io');
const ss = require('socket.io-stream');
const proximify = require('proximify');
const untildify = require('untildify');
const secret = require('../utils/secret');
const debug = require('debug')('socket-file-sync');

module.exports = server;

async function server(config) {
  const server = proximify(http.createServer((req, res) => res.end('Server ready')));
  const io = proximify(IO(server));

  try {
    console.log('Starting socket server on port', config.port + '...');
    const p = Promise.race(['listening', 'error'].map(_ => server.onceAsync(_)));
    server.listen(config.port);
    await p;
    console.log('Listening for connections');
  } catch (error) {
    console.error('Could not start socket server.', error.message);
    process.exit(1);
  }

  io.on('connection', socket => onConnection(proximify(socket), config));
}

async function onConnection(socket, config) {
  console.log('New socket connection.');
  console.log('Waiting for authentication...');
  const secret = await socket.onceAsync('auth');
  if (secret !== config.secret) {
    const error = 'Secret did not match';
    socket.emit('auth', { error });
    console.error('Authentication failed.', error);
    return;
  }
  socket.emit('auth', { success: true });
  console.log('Authenticated!');

  const serverDir = Path.normalize(untildify(await socket.onceAsync('serverDir')));
  console.log('Checking', serverDir + '...');
  await fs.access(serverDir);
  console.log('serverDir exists');
  console.log('Waiting to receive files...');

  socket.on('sending-file', async relative => {
    console.log('Receiving', relative + '...');
    const path = Path.normalize(Path.join(serverDir, relative));
    const backup = path + '.sfs-bkp';
    await fs.ensureFile(path);
    await fs.copy(path, backup);
    const stream = proximify(ss.createStream());
    ss(socket).emit('file:' + relative, stream);
    stream.pipe(fs.createWriteStream(path));
    // stream.pipe(process.stdout);
    try {
      await stream.onceAsync('end');
      console.log('Received', relative);
      await fs.remove(backup);
    } catch (error) {
      console.error('Failed to receive:', relative);
      console.log('Restoring original...');
      await fs.copy(backup, path);
    }
  });
}

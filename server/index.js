const fs = require('fs-extra');
const Path = require('path');
const http = require('http');
const IO = require('socket.io');
const ss = require('socket.io-stream');
const proximify = require('proximify');
const untildify = require('untildify');
const secret = require('../utils/secret');
const debounce = require('debounce-queue');
const watch = require('../utils/watch');
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
  console.log('Authenticated.');

  const serverDir = Path.normalize(untildify(await socket.onceAsync('serverDir')));
  console.log('Checking', serverDir + '...');
  await fs.access(serverDir);
  console.log('serverDir exists');

  console.log('Waiting to receive files...');
  socket.on('sending-file', async relative => {
    const timeout = setTimeout(() => console.log('Receiving', relative + '...'), 1000);
    const path = Path.join(serverDir, relative);
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
    } catch (error) {
      console.error('Failed to receive:', relative);
      console.log('Restoring original...');
      await fs.copy(backup, path);
    }
    await fs.remove(backup);
    clearTimeout(timeout);
  });

  if (!config.twoWay) {
    socket.on('twoWay', () => {
      console.warn('Rejecting client two-way request');
      socket.emit('twoWay', false);
    });
  } else {
    socket.once('twoWay', async () => {
      socket.emit('twoWay', true);
      console.log('Initializing file watcher for two-way sync...')
      const watcher = await watch(serverDir, { cwd: serverDir });
      console.log('Watching for changes...');
      watcher.on('change', debounce(files => files.map(async relative => {
        relative = relative.replace(/[\/\\]+/g, '/');
        const full = Path.join(config.cwd, relative);
        socket.emit('sending-file', relative);
        const stream = await proximify(ss(socket)).onceAsync('file:' + relative);
        fs.createReadStream(full).pipe(stream);
        try {
          await stream.onceAsync('end');
          console.log('Sent', relative);
        } catch (error) {
          console.error('Failed to send', relative);
        }
      }), 1000));

      let fileWatcherCloseTimeout
      socket.on('disconnect', () => fileWatcherCloseTimeout = setTimeout(() => watcher.close(), 30000));
      socket.on('reconnect', () => clearTimeout(fileWatcherCloseTimeout));
    });
  }
}

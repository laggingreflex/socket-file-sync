const fs = require('fs-extra');
const Path = require('path');
const http = require('http');
const IO = require('socket.io');
const ss = require('socket.io-stream');
const proximify = require('proximify');
const untildify = require('untildify');
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
  console.log('New connection');

  let isAuthenticated, serverDir, watcher;

  const emitError = error => {
    socket.emit('error', error);
    console.error(error);
  }

  socket.on('auth', secret => {
    if (secret === config.secret) {
      isAuthenticated = true;
      console.log('Authenticated');
    } else {
      const error = 'Secret did not match';
      socket.emit('auth', { error });
      console.error('Authentication failed.', error);
    }
  });
  socket.on('serverDir', async _ => {
    serverDir = Path.normalize(untildify(_.replace(/[\/\\]/g, '/')))
    try {
      await fs.access(serverDir);
      console.log('Syncing to:', serverDir);
      socket.emit('serverDir', { success: true });
    } catch (error) {
      console.error('Cannot sync to:', serverDir, error.message)
      serverDir = null;
      socket.emit('serverDir', { error: error.message });
    }
  });

  socket.on('sending-file', async relative => {
    if (!isAuthenticated) {
      return emitError('Unauthorized');
    }
    if (!serverDir) {
      return emitError('serverDir does not exists');
    }
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

  socket.on('twoWay', async() => {
    if (!config.twoWay) {
      console.warn('Rejecting client two-way request');
      socket.emit('twoWay', false);
      return;
    }
    if (watcher) {
      console.log('Two way already initialized')
      socket.emit('twoWay', true);
      return;
    }

    socket.emit('twoWay', true);
    console.log('Initializing file watcher for two-way sync...')
    watcher = await watch(serverDir, { cwd: serverDir });
    console.log('Watching for changes...');
    watcher.on('change', debounce(files => files.map(async relative => {
      relative = relative.replace(/[\/\\]+/g, '/');
      const full = Path.join(serverDir, relative);
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

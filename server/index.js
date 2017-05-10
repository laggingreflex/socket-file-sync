const fs = require('fs-extra');
const os = require('os');
const Path = require('path');
const http = require('http');
const IO = require('socket.io');
const proximify = require('proximify');
const untildify = require('untildify');
const debounce = require('debounce-queue');
const watch = require('../utils/watch');
const streamSocket = require('../utils/ss-simple');
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

  const send = streamSocket(socket, () => serverDir);

  if (config.twoWay && !watcher) {
    watcher = await watch(serverDir, { cwd: serverDir });
    console.log('Watching for changes...');
    watcher.on('change', debounce(files => files.map(relative => send({ relative })), 1000));
    let fileWatcherCloseTimeout
    socket.on('disconnect', () => fileWatcherCloseTimeout = setTimeout(() => watcher.close(), 30000));
    socket.on('reconnect', () => clearTimeout(fileWatcherCloseTimeout));
  }

}

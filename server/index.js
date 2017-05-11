const fs = require('fs-extra');
const os = require('os');
const Path = require('path');
const http = require('http');
const IO = require('socket.io');
const proximify = require('proximify');
const untildify = require('untildify');
const debounce = require('debounce-queue');
const watch = require('../utils/watch');
const streamSocket = require('../utils/socket-stream');
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

  let isAuthenticated,
    serverDir,
    watcher, fileWatcherCloseTimeout;

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

  const send = streamSocket(socket, () => serverDir, () => {
    if (!isAuthenticated) {
      throw new Error('Unauthorized');
    }
    if (!serverDir) {
      throw new Error('serverDir not sent or does not exist');
    }
  });

  socket.on('server-dir', async _ => {
    serverDir = Path.normalize(untildify(_.replace(/[\/\\]/g, '/')))
    try {
      await fs.access(serverDir);
      console.log('Syncing to:', serverDir);
      socket.emit('server-dir:response', null, { serverDir });
    } catch (error) {
      console.error('Cannot sync to:', serverDir, error.message)
      serverDir = null;
      socket.emit('server-dir:response', error.message, { serverDir });
      return;
    }
  });

  socket.on('enable-two-way', async() => {
    if (!(config.twoWay || config.project.twoWay)) {
      socket.emit('enable-two-way:response', 'twoWay not enabled by server');
      return;
    }
    if (!serverDir) {
      socket.emit('enable-two-way:response', 'serverDir not sent or does not exist');
      return;
    }
    if (watcher) {
      socket.emit('enable-two-way:response', 'already enabled');
      return;
    }
    try {
      watcher = await watch(serverDir, { cwd: serverDir });
      console.log('Watching for changes...');
      watcher.on('change', debounce(files => files.map(relative => send({ relative })), 1000));
      socket.emit('enable-two-way:response', null, { success: true });
    } catch (error) {
      console.error('Watched failed:', error.message);
      socket.emit('enable-two-way:response', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.warn('Socket disconnected. Waiting re-connection...');
    if (watcher) {
      fileWatcherCloseTimeout = setTimeout(() => {
        console.warn('Socket did not re-connect after 30s, closing file-watcher');
        watcher.close();
        watcher = null;
      }, 30000);
    }
  });
  socket.on('reconnect', () => {
    console.log('Socket re-connected');
    clearTimeout(fileWatcherCloseTimeout)
  });

}

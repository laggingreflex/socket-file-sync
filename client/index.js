const io = require('socket.io-client');
const streamSocket = require('../utils/ss-simple');
const proximify = require('proximify');
const fs = require('fs-extra');
const Path = require('path');
const debounce = require('debounce-queue');
const watch = require('../utils/watch');

module.exports = client;

async function client(config) {
  let server = config.project.server || config.server;
  if (!server) {
    await config.prompt('server', { require: true });
    await config.save();
    server = config.server;
  }
  if (!server.match(/^http|^\/\//)) {
    server = 'http://' + config.server;
  }
  if (!config.project.serverDir) {
    await config.project.prompt('serverDir', { require: true });
    await config.project.save();
  }
  const serverDir = config.project.serverDir;
  server = server + ':' + config.port;
  console.log('Connecting to', server + '...');

  const socket = io.connect(server);
  // const streamSocket = ss(socket);

  socket.on('connect', () => console.log('Connected'));
  socket.on('disconnect', () => console.warn('Disconnected. Waiting to reconnect...'));
  socket.on('error', error => console.error('Error:', error));
  socket.on('reconnect', () => console.log('Reconnected'));

  socket.on('auth', ({ error, success }) => {
    if (success) {
      console.log('Authenticated');
    } else {
      console.error('Failed to authenticate.', error);
    }
  });

  socket.on('serverDir', ({ error, success }) => {
    if (success) {
      console.log('Syncing to:', serverDir);
    } else {
      console.error('Cannot sync to:', serverDir, error)
    }
  });

  const send = streamSocket(socket, () => config.cwd);

  const watcher = await watch(config.cwd, { cwd: config.cwd });
  watcher.on('change', debounce(files => files.map(relative => send({ relative })), 1000));

  console.log('Initializing...');
  socket.emit('auth', config.secret);
  socket.emit('serverDir', serverDir);
}

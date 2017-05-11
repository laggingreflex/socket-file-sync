const io = require('socket.io-client');
const streamSocket = require('../utils/socket-stream');
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

  socket.on('connect', () => console.log('Connected'));
  socket.on('disconnect', () => console.warn('Disconnected. Waiting to reconnect...'));
  socket.on('error', error => console.error('Error:', error));
  socket.on('reconnect', () => console.log('Reconnected'));

  socket.on('auth:response', error => error
    ? console.error('Failed to authenticate.', error)
    : console.log('Authenticated'));

  socket.on('server-dir:response', (error, { serverDir }) => error
    ? console.error('Cannot sync to:', serverDir, error)
    : console.log('Syncing to:', serverDir));

  const send = streamSocket(socket, () => config.cwd, mode => {
    if (mode === 'receive' && !config.twoWay) {
      throw new Error('Rejected file sent from server. Set --two-way option to enable')
    }
  });

  const watcher = await watch(config.cwd, { cwd: config.cwd });
  watcher.on('change', debounce(files => files.map(relative => send({ relative })), 1000));
  watcher.on('add', debounce(files => files.map(relative => send({ relative })), 1000));
  if (config.deleteOnRemote) {
    watcher.on('unlink', debounce(files => files.map(relative => socket.emit('delete-file', { relative })), 1000));
    socket.on('delete-file:response', (error, { relative }) => error
      ? console.error('Deletion failed', relative, error)
      : console.log('Deleted', relative)
    );
  }
  if (config.deleteByRemote) {
    socket.on('delete-file', ({ relative }) => fs.remove(Path.join(config.cwd, relative))
      .then(() => socket.emit('delete-file:response', null, { relative }))
      .catch(error => socket.emit('delete-file:response', error.message, { relative }))
    );
  }

  console.log('Initializing...');

  socket.emit('auth', config.secret);
  socket.emit('server-dir', serverDir);

  socket.once('server-dir:response', error => {
    if (!error && (config.twoWay || config.project.twoWay)) {
      console.log('Enabling two-way sync from server...');
      socket.emit('enable-two-way');
    }
  });
  socket.on('enable-two-way:response', error => error
    ? console.error('Failed to enable two-way sync by server.', error)
    : console.log('Two-way enabled by server')
  );
}

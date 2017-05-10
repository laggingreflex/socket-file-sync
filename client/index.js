const io = require('socket.io-client');
const ss = require('socket.io-stream');
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
  const socket = proximify(io.connect(server));
  try {
    await Promise.race(['connect', 'error'].map(_ => socket.onceAsync(_)));
    console.log('Connected.');
  } catch (error) {
    console.error('Failed to connect to the socket server.', error.message);
    process.exit(1);
  }

  const initialize = async() => {
    console.log('Authenticating...');
    socket.emit('auth', config.secret);
    const { error, success } = await socket.onceAsync('auth');
    if (!success) {
      console.error('Failed to authenticate.', error);
      process.exit(2);
      return;
    }
    console.log('Authenticated.');
    socket.emit('serverDir', serverDir);
  };

  const watcherPromise = watch(config.cwd, { cwd: config.cwd });
  const initPromise = initialize();

  const [watcher] = await Promise.all([watcherPromise, initPromise]);

  socket.on('disconnect', () => {
    console.warn('Disconnected. Waiting to reconnect...')
  });
  socket.on('reconnect', () => {
    console.log('Reconnecting...')
    initialize();
  });

  console.log('Watching for changes...')
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

  try {
    await socket.onceAsync('error');
  } catch (error) {
    console.error('Socket errored:', error.message);
    process.exit(3);
  }
}

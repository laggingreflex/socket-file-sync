const io = require('socket.io-client');
const ss = require('socket.io-stream');
const proximify = require('proximify');
const fs = require('fs-extra');
const Path = require('path');
const debounce = require('debounce-queue');
const watch = require('../utils/watch');

module.exports = client;

async function client(config) {
  if (!config.server) {
    await config.prompt('server', { require: true });
  }
  if (!config.server.match(/^http|^\/\//)) {
    config.server = 'http://' + config.server;
    console.warn('Server address must start with protocol. Using:', config.server)
  }
  if (!config.serverDir) {
    await config.prompt('serverDir', { require: true });
  }
  const server = config.server + ':' + config.port;
  console.log('Connecting to', server);
  const socket = proximify(io.connect(server));
  console.log('Authenticating...');
  socket.emit('auth', { secret: config.secret });
  const { error, success } = await socket.onceAsync('auth');
  if (!success) {
    console.error('Could not authenticate. Make sure you have the same secret as the server');
    console.error(error);
    process.exit(2);
    return;
  }
  console.log('Authenticated!');

  socket.emit('serverDir', config.serverDir);

  const watcher = await watch(config.cwd, { cwd: config.cwd });

  watcher.on('change', debounce(files => files.map(async relative => {
    const full = Path.join(config.cwd, relative);
    socket.emit('sending-file', relative);
    const stream = await proximify(ss(socket)).onceAsync('file');
    fs.createReadStream(full).pipe(stream);
    await stream.onceAsync('end');
    console.log('Sent', relative);
  }), 1000));

  // process.exit(0);
}

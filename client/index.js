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

  const socket = io.connect(server);
  const streamSocket = ss(socket);

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

  const watcher = await watch(config.cwd, { cwd: config.cwd });
  watcher.on('change', debounce(files => files.map(async relative => {
    // send a signal to indicate that we're going to send this file
    relative = relative.replace(/[\/\\]+/g, '/');
    socket.emit('sending-file', relative);
  }), 1000));

  streamSocket.on('send-file', (stream, { relative }) => {
    // send the requested file, piping it into this stream
    relative = relative.replace(/[\/\\]+/g, '/');
    const full = Path.join(config.cwd, relative);
    fs.createReadStream(full).pipe(stream);
    stream.once('end', () => console.log('Sent', relative));
    stream.once('error', error => {
      console.error('Failed to send', relative + ':', error)
      // try again?
      // socket.emit('sending-file', relative)
    });
  });

  // server wants to send a file
  socket.on('sending-file', async relative => {
    const timeout = setTimeout(() => console.log('Receiving', relative + '...'), 1000);

    relative = relative.replace(/[\/\\]+/g, '/');
    const path = Path.join(config.cwd, relative);
    const backup = path + '.sfs-bkp';

    await fs.ensureFile(path);
    await fs.copy(path, backup);

    const stream = ss.createStream();
    streamSocket.emit('send-file', stream, { relative });

    stream.pipe(fs.createWriteStream(path));

    stream.once('end', async() => {
      console.log('Received', relative)
      // check for integrity?
      await fs.remove(backup);
      clearTimeout(timeout);
    });
    stream.once('error', async error => {
      console.error('Failed to receive', relative + ':', error)
      await fs.copy(backup, path);
      await fs.remove(backup);
      clearTimeout(timeout);
    });
  });

  console.log('Initializing...');
  socket.emit('auth', config.secret);
  socket.emit('serverDir', serverDir);
}

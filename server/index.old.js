const os = require('os');
const Path = require('path');
const https = require('https');
const pem = require('https-pem');
const fs = require('fs');
const IO = require('socket.io');
const untildify = require('untildify');
const proximify = require('proximify');
const debounce = require('debounce-queue');
const acknowledge = require('socket.io-acknowledge')
const watch = require('../utils/watch');
const streamSocket = require('../utils/socket-stream');
const use = require('./use');
const on = require('./on');
const debug = require('debug')('socket-file-sync');

module.exports = server;

async function server(config) {
  const server = https.createServer(pem, (req, res) => res.end('Socket File Sync running'));
  const io = IO(server);

  try {
    console.log('Starting socket server on port', config.port + '...');
    const p = Promise.race([
      new Promise((r) => server.once('listening', r)),
      new Promise((r, x) => server.once('error', x)),
    ]);
    server.listen(config.port);
    await p;
    console.log('Listening for connections');
  } catch (error) {
    console.error('Could not start socket server.', error.message);
    process.exit(1);
  }

  io.use(use.log(config));
  io.use(use.secret(config));
  io.use(use.config(config));
  io.use(use.serverDir(config));
  io.use(acknowledge);

  io.on('connection', on.connection(config));
}

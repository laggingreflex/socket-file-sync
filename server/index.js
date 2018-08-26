const http = require('http');
const IO = require('socket.io');
const acknowledge = require('socket.io-acknowledge')
const encrypt = require('socket.io-encrypt')
const asyncBreak = require('break-async-iterator');
const utils = require('../utils')
const use = require('./use');
const on = require('./on');

module.exports = async function(config) {

  const server = http.createServer((req, res) => res.end('Socket File Sync running'));
  const io = IO(server);

  try {
    // console.log('Starting socket server on port', config.port + '...');
    const p = Promise.race([
      new Promise((r) => server.once('listening', r)),
      new Promise((r, x) => server.once('error', x)),
    ]);
    server.listen(config.port || 8081, config.ip);
    await p;
    console.log('Listening for connections on', server.address());
  } catch (error) {
    throw new Error(`Error starting server. ${error.message}`);
  }

  io.use = (use => fn => use(async (socket, next) => {
    try {
      await fn(socket);
      next();
    } catch (error) {
      if (error instanceof utils.Error) {
        socket.log.error(error.message);
      } else {
        socket.log.error(error);
      }
      next(error);
    }
  }))(io.use.bind(io));

  io.use(use.log(config));
  io.use(use.config(config));
  io.use(acknowledge);
  io.use(encrypt(config.secret));

  io.on('connection', on.connection(config));

  const cleanup = () => {
    try { io.close(); } catch (warn) { console.warn(warn); }
  };

  const done = new Promise((r, x) => {
    io.on('close', r);
    io.on('error', x);
  }).finally(cleanup);

  return { io, cleanup, done };
};

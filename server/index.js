const http = require('http');
const IO = require('socket.io');
const acknowledge = require('socket.io-acknowledge')
const { config } = require('../config')
const use = require('./use');
const on = require('./on');

module.exports = async config => {
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
    console.error(error);
    console.error('Error starting server');
    process.exit(1);
  }

  // io.use(socket => console.log('hji'));
  io.use = (use => fn => use(async (socket, next) => {
    try {
      await fn(socket);
      next();
    } catch (error) {
      socket.log.error(error);
      next(error);
    }
  }))(io.use.bind(io));
  io.use(use.log(config));
  io.use(use.config(config));
  io.use(acknowledge);

  io.on('connection', on.connection(config));
}

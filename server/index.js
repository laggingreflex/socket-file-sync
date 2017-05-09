/*
  todo run on https - we're exchanging secret (which though itself encrypted) can be sniffed by man in middle attack
*/

const proximify = require('proximify');
const IO = require('socket.io');
const ss = require('socket.io-stream');
const http = require('http');
const Koa = require('koa');
const esModules = require('koa-es-modules-rollup');
const bodyparser = require('koa-bodyparser');
const route = require('koa-route');
const secret = require('../utils/secret');
const fs = require('fs-extra');
const html = require('./client/html');
const debug = require('debug')('socket-file-sync');

module.exports = server;

async function server(config) {
  const app = proximify(new Koa());
  const server = proximify(http.createServer(app.callback()));
  const io = proximify(IO(server));

  app.keys = [config.secret];

  app.use(bodyparser());

  // handle errors
  app.use((ctx, next) => next().catch(err => {
    console.error(ctx.url, err);
    ctx.body = err.message;
    ctx.status = 500;
  }));

  app.use(esModules({
    root: __dirname + '/client',
  }));

  app.use(route.post('/auth', async ctx => {
    if (!ctx.request.body || !ctx.request.body.secret) {
      throw new Error('Need a body');
    }
    if (await secret.verify(ctx.request.body.secret)) {
      ctx.body = { success: true, token: config.secret };
    } else {
      throw new Error('Wrong secret');
    }
  }));

  // render main app
  app.use(async ctx => ctx.body = html);

  // start socket.io
  io.on('connection', socket => onConnection(proximify(socket), config));

  await server.listenAsync(config.port);
  console.log('Listening on port', config.port);
}

async function onConnection(socket, config) {
  console.log('New socket connection.');
  console.log('Waiting for authentication...');
  const authData = await socket.onceAsync('auth');
  if (!authData || !authData.secret) {
    console.warn('Did not receive secret');
    socket.emit('auth', { error: 'Did not send secret' });
  }
  if (authData.secret === config.secret) {
    socket.emit('auth', { success: true });
    console.log('Authenticated!');
  } else {
    socket.emit('auth', { error: 'Secret did not match' });
    console.error('Authentication failed.');
    return;
  }

  const serverDir = await socket.onceAsync('serverDir');
  console.log('Checking', serverDir + '...');
  await fs.access(serverDir);
  console.log('serverDir exists');
  console.log('Waiting to receive files...');

  socket.on('sending-file', async relative => {
    console.log('Receiving', relative + '...');
    const path = Path.normalize(Path.join(serverDir, relative));
    await fs.ensureFile(path);
    const stream = proximify(ss.createStream());
    ss(socket).emit('file', stream);
    stream.pipe(fs.createWriteStream(path));
    // stream.pipe(process.stdout);
    await stream.onceAsync('end');
    console.log('Received', file);
  });
}

const io = require('socket.io-client');
const { URL } = require('url');
const Cryptr = require('cryptr')

module.exports = async config => {

  if (!config.secret) throw new Error('Need a secret');
  const cryptr = new Cryptr(config.secret);

  if (!config.server) {
    throw new Error('Need a server');
  }

  let rawUrl = config.server;
  if (!rawUrl.match(/^http:/)) {
    rawUrl = 'http://' + rawUrl;
  }

  const serverUrl = new URL(rawUrl);

  if (serverUrl.port && serverUrl.port !== config.port) {
    if (serverUrl.port !== config.port) {
      throw new Error(`{serverUrl.port: ${serverUrl.port}} !== {config.port: ${config.port}}`);
    }
  } else if (config.port) {
    serverUrl.port = config.port;
  } else {
    throw new Error('Need a port');
  }

  // console.log(`Connecting to`, String(serverUrl));
  const socket = io(String(serverUrl), {
    // rejectUnauthorized: false,
    query: {
      config: cryptr.encrypt(JSON.stringify({
        serverDir: config.serverDir,
      })),
    }
  });

  const on = (event, { error = null, success = null } = {}) => new Promise((resolve, reject) => socket.once(event, (data = '') => {
    if (error !== null) {
      console.error(...[error, data].filter(Boolean));
      reject(new Error([error, data].filter(Boolean).join(' ')))
    } else {
      console.log(success, data);
      resolve(data)
    }
  }));

  await Promise.race([
    Promise.all([
      on('connect', { success: `Connected to ${String(serverUrl)}` }),
      on('ready', { success: `Ready` }),
    ]),
    on('connect_error', { error: `Error connecting to ${String(serverUrl)}.` }),
    on('error', { error: '' }),
  ]);

  socket.on('error', () => console.error('?????????'))


  // socket.on('connect', console.error)
  // socket.on('connect_error', console.er    ror)
  // const socket = io('https://127.0.0.1:8081/');
  // console.log(`socket:`, socket);
  // socket.on('connecting', () => {
  //   console.log('connecting');
  // })
};

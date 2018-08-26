const Path = require('path');
const fs = require('fs-extra');
const io = require('socket.io-client');
const { URL } = require('url');
const Cryptr = require('cryptr');
const asyncBreak = require('break-async-iterator');
const watch = require('file-watch-iterator');
const acknowledge = require('socket.io-acknowledge')
const encrypt = require('socket.io-encrypt')
const utils = require('../utils');

module.exports = async function(config) {
  const cryptr = new Cryptr(config.secret);

  let rawUrl = config.server || config.ip;
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
        ...config,
        remoteDir: config.remoteDir,
      })),
    }
  });

  encrypt(config.secret)(socket);
  acknowledge(socket);

  const onConnect = new Promise(_ => socket.once('connect', _));

  const onError = Promise.race([
    new Promise((_, x) => socket.once('error', error => x(new utils.Error(`Server error: ${error}`)))),
    new Promise((_, x) => socket.once('connect_error', error => x(new utils.Error(`Failed to connect to '${String(serverUrl)}' (${error.message})`)))),
  ]).catch(error => {
    socket.close();
    throw error;
  });

  await (Promise.race([onConnect, onError]));

  // console.log(`Connected to:`, `${socket.io.opts.hostname}:${socket.io.opts.port}`);

  const relative = f => Path.relative(config.cwd, f).replace('\\', '/');

  console.log('Syncing:', config.cwd);
  console.log(`With ->:`, config.remoteDir, `(on ${socket.io.opts.hostname}:${socket.io.opts.port})`);

  let watcher;
  const watcherDone = (async () => {
    let firstTime = true;
    watcher = watch(config.cwd);
    for await (const _files of (watcher)) try {
      if (firstTime && !(firstTime = false)) {
        if (config.initialSync === false) {
          continue;
        }
      }
      const files = _files.toArray().filter(f => f.changed && ['add', 'change', 'unlink'].includes(f.event) && relative(f.file));
      console.log(`Syncing ${files.length} files...`);
      await Promise.all(files.map(async ({ event, changed, file }, i, { length }) => {
        file = relative(file);
        const label = `[${i+1}/${length}]`;
        try {
          if (!changed) return;
          const data = await fs.readFile(file, 'utf8').catch(() => {});
          await socket.emit('file', { file, event, data });
          console.log(label, `Synced:`, file);
        } catch (error) { console.error(label, `Failed:`, file, `(${error})`); }
      }));
    } catch (error) { console.error(`Failed:`, error.message); }
  })();

  const cleanup = () => {
    try { socket.close(); } catch (warn) { console.warn(warn); }
    try { watcher.return(); } catch (warn) { console.warn(warn); }
  }

  const socketDone = Promise.race([
    new Promise(_ => socket.on('close', _)),
  ]);

  const done = Promise.race([watcherDone, socketDone]).finally(cleanup);

  return { socket, cleanup, done }
};

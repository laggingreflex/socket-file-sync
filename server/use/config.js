const Path = require('path');
const fs = require('fs-extra');
const utils = require('../../utils');
const { normalize } = require('path');
const untildify = require('untildify');
const Cryptr = require('cryptr')
const { getConfig, getProxyConfig } = require('../../config');

module.exports = config => async socket => {

  const cryptr = new Cryptr(config.secret);
  const { query } = socket.handshake;
  if (!query.config) {
    throw new Error('Invalid clientConfig');
  }

  const clientConfig = utils.tryCatch(() => JSON.parse(cryptr.decrypt(query.config)), `Couldn't decrypt {clientConfig: '${utils.trunc(query.config)}'} (Invalid secret or Invalid JSON)`);

  if (!clientConfig || !Object.keys(clientConfig).length) {
    throw new Error('Invalid clientConfig');
  }

  if (!clientConfig.remoteDir) {
    throw new Error(`Invalid {remoteDir: ${clientConfig.remoteDir}}`);
  }

  if (clientConfig.twoWay && !config.twoWay) {
    throw new Error(`'twoWay' configured on client but not on server`);
  }

  clientConfig._remoteDir = clientConfig.remoteDir;
  clientConfig.remoteDir = untildify(clientConfig.remoteDir.replace(/[\/\\]/g, '/'));
  if (!Path.isAbsolute(clientConfig.remoteDir)) {
    throw new Error(`Invalid {remoteDir: '${clientConfig._remoteDir}'} (path must be /absolute, or relative to home ~/)`);
  }
  clientConfig.remoteDir = normalize(untildify(clientConfig.remoteDir.replace(/[\/\\]/g, '/')));

  await utils.tryCatch(() => fs.access(clientConfig.remoteDir), `Invalid {remoteDir: '${clientConfig._remoteDir}'}`);

  clientConfig.cryptr = cryptr;
  socket.clientConfig = clientConfig;
};

const fs = require('fs-extra');
const { normalize } = require('path');
const untildify = require('untildify');
const Cryptr = require('cryptr')
const { getConfig, getProxyConfig } = require('../../config');

module.exports = config => async socket => {

  if (!config.secret)
    throw new Error('Need a secret');
  const cryptr = new Cryptr(config.secret);
  if (!socket.handshake.query.config)
    throw new Error('Invalid clientConfig');
  let clientConfig = socket.handshake.query.config;
  try {
    clientConfig = cryptr.decrypt(clientConfig)
  } catch (error) {
    error.message = `Couldn't decrypt clientConfig (Invalid secret?). ` + error.message;
    throw error;
  }
  try {
    clientConfig = JSON.parse(clientConfig)
  } catch (error) {
    error.message = `Couldn't parse clientConfig. ` + error.message;
    throw error;
  }

  if (!clientConfig || !Object.keys(clientConfig).length)
    throw new Error('Invalid clientConfig');

  if (!clientConfig.serverDir)
    throw new Error(`Invalid \`config.serverDir\` provided: '${clientConfig.serverDir}'`);

  try {
    socket.serverDir = normalize(untildify(clientConfig.serverDir.replace(/[\/\\]/g, '/')))
    await fs.access(socket.serverDir);
  } catch (error) {
    error.message = `Invalid \`config.serverDir\` provided: '${clientConfig.serverDir}'. ` + error.message;
    throw error;
  }

  try {
    socket.serverDirConfig = config.getConfig(socket.serverDir);
  } catch (error) {
    error.message = `Couldn't read \`serverDir.config\`. ` + error.message;
    throw error;
  }

  if (clientConfig.twoWay && !socket.serverDirConfig.twoWay)
    throw new Error(`{clientConfig.twoWay: ${clientConfig.twoWay}} !== {serverDirConfig.twoWay: ${socket.serverDirConfig.twoWay}}`);

  socket.log('Syncing to:', socket.serverDir);
};

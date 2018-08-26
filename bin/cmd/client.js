const utils = require('../utils');
const asyncBreak = require('break-async-iterator');
exports.command = 'client [server] [remoteDir]';
exports.aliases = ['c'];
exports.describe = 'Run this on your client, in each dir you want to sync to the server';
exports.builder = {
  cwd: {
    type: 'string',
    default: process.cwd(),
    description: 'Local directory to sync',
  },
  server: {
    alias: ['ip'],
    type: 'string',
    require: true,
    description: 'Server to sync to',
  },
  remoteDir: {
    type: 'string',
    require: true,
    description: 'Remote directory to sync to',
  },
}
exports.handler = async argv => {
  const { socket, cleanup, done } = await require('../../client')(argv);

  const off = utils.onMessage({
    STOP: () => {
      cleanup();
      off();
    }
  });

  return done;
};

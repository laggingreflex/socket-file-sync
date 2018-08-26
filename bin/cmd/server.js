const utils = require('../utils');
exports.command = 'server';
exports.aliases = ['s'];
exports.describe = 'Run this on your server, just once, but the process should keep running, and should have read/write permissions to the dirs you wish to sync to';
exports.builder = {
  allowedClients: {
    type: 'array',
    default: ['*'],
    description: 'Clients (IP Addresses) that are allowed to connect',
  },
  ip: {
    type: 'string',
    description: 'IP address at which server should listen on',
  },
}
exports.handler = async argv => {
  const { done, cleanup } = await require('../../lib/server')(argv);
  const off = utils.onMessage({
    STOP: () => {
      cleanup();
      off();
    }
  });
  return done;
};

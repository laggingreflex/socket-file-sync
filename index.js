#!/usr/bin/env node

const config = require('./config');
const secret = require('./utils/secret');

(async() => {

  await secret.get();

  await config.readConfigFile('.socket-file-sync', { silent: true });

  if (config.mode === 'server') {
    require('./server')(config);
  } else {
    require('./client')(config);
  }

})();

process.on('unhandledRejection', console.error);

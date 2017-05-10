#!/usr/bin/env node

const config = require('./config');
const secret = require('./utils/secret');

(async() => {

  if (config.help) {
    console.log('Todo, just see this for now:', require('fs').readFileSync(__filename, 'utf8'));
    process.exit(0);
  }

  if (config.editConfig) {
    await config.prompt();
    await config.save();
    await config.project.prompt('saveProject');
    if (config.project.saveProject) {
      await config.project.prompt();
      await config.project.save();
    }
    process.exit(0);
  }

  const mode = config.mode || config._[0];
  if (!mode || (mode.charAt(0) !== 's' && 'c' !== mode.charAt(0))) {
    console.error('Need a mode to run in: [server|client]');
    process.exit(1);
  } else {
    config.mode = mode;
  }

  await secret.get();

  await config.readConfigFile('.socket-file-sync', { silent: true });

  if (mode.charAt(0) === 's') {
    require('./server')(config);
  } else {
    require('./client')(config);
  }

})();

process.on('unhandledRejection', console.error);

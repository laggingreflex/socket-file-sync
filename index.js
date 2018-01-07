#!/usr/bin/env node

const config = require('./config');
const cluster = require('cluster');

main();

async function main() {
  process.on('SIGINT', function () {
    process.exit(0);
  });

  if (config.help) {
    console.log('Todo, just see this for now:', require('fs').readFileSync(__filename, 'utf8'));
    process.exit(0);
  }

  if (config.editConfig) {
    await config.prompt();
    await config.save();
    await config.prompt('saveProjectConfig');
    if (config.saveProjectConfig) {
      await config.cwdConfig.prompt();
      await config.cwdConfig.save();
    }
    process.exit(0);
  }

  if (!config.cwdConfig.secret) {
    await config.prompt('secret', { required: true });
  }
  await config.save();

  const mode = config.mode || config._[0];
  if (!mode || (mode.charAt(0) !== 's' && 'c' !== mode.charAt(0))) {
    console.error('Need a mode to run in: [server|client]');
    process.exit(1);
  } else {
    config.mode = mode;
  }

  if (cluster.isMaster) {
    cluster.fork();
    cluster.on('exit', (worker, code, signal) => {
      console.log('Restarting...')
      cluster.fork();
    });
  } else {
    if (mode.charAt(0) === 's') {
      require('./server')(config);
    } else {
      let toSave = false
      if (!config.cwdConfig.server) {
        await config.cwdConfig.prompt('server', { require: true });
        toSave = true;
      }
      if (!config.cwdConfig.serverDir) {
        await config.cwdConfig.prompt('serverDir', { require: true });
        toSave = true;
      }
      if (toSave) {
        await config.cwdConfig.save();
      }
      require('./client')(config);
    }
  }
}

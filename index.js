#!/usr/bin/env node

const config = require('./config');
const cluster = require('cluster');

main();

async function main() {
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

  if (!config.project.secret && !config.secret) {
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
      if (!config.project.server) {
        await config.project.prompt('server', { require: true });
      }
      if (!config.project.serverDir) {
        await config.project.prompt('serverDir', { require: true });
      }
      await config.project.save();
      require('./client')(config);
    }
  }
}

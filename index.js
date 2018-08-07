#!/usr/bin/env node

const { homeConfig, config } = require('./config');

main();

async function main() {

  if (!config.secret) {
    await homeConfig.prompt('secret', { required: true });
    await homeConfig.save();
  }
  await config.save();

  try {
    const mode = config.mode || config._[0];
    if (mode === 's' || mode === 'server') {
      await require('./server')({ config });
    } else if (mode === 'c' || mode === 'client') {
      await require('./server')({ config });
    } else {
      console.error('Need a mode: client|server');
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(2);
  }
}

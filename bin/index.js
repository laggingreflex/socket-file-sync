#!/usr/bin/env node

const yargs = require('yargs');
const utils = require('./utils');

const argv = yargs
  .scriptName('sfs')
  .commandDir('./cmd')
  .options(require('./options'))
  .wrap(null)
  .version(false)
  .fail(utils.fail)
  .argv;

if (argv.h || argv['/?'] || !argv._.length || argv._[0].match(/^(h|help)$/)) {
  yargs.showHelp();
}

const { readdirSync } = require('fs');
const { basename } = require('path');

module.exports = readdirSync(__dirname)
  .filter(_ => _ !== basename(__filename))
  .map(_ => _.replace(/\.js$/, ''))
  .reduce((exports, module) => Object.assign(exports, {
    [module]: require('./' + module)
  }), {});

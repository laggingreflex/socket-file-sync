const Path = require('path')
const Configucius = require('configucius');
const merge = require('proxy-merge');
const help = require('../help');
const options = require('./defaults');


const _getConfig = Config => (dir, options) => new Config({
  configFile: Path.join(dir, '/.socket-file-sync'),
  options: Object.assign({}, options, {
    cwd: {
      type: 'string',
      default: Path.join(dir),
    }
  })
})

const Config = class extends Configucius {
  getConfig(...args) {
    // console.log(`this:`, this);
    console.log(`this.secret:`, this.secret);
    console.log(`this.get('secret'):`, this.get('secret'));
    return merge(this, _getConfig(this.constructor)(...args));
  }
}

const getConfig = exports.getConfig = _getConfig(Config);

const homeConfig = exports.homeConfig = getConfig('~');
const cwdConfig = exports.cwdConfig = getConfig(process.cwd());

const config = exports.config = exports.default = merge(cwdConfig, homeConfig);

if (config.help) {
  help(config);
  process.exit(0);
}

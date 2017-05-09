const config = module.exports = new(require('configucius').default)({
  configFile: '~/.socket-file-sync',
  options: {
    secret: {
      type: 'string',
      save: true,
    },
    port: {
      type: 'number',
      default: 50581,
      save: true,
    },
    server: {
      type: 'string',
    },
    serverDir: {
      type: 'string',
    },
    cwd: {
      type: 'string',
      default: process.cwd(),
    },
    mode: {
      type: 'string',
    },
    help: {
      alias: ['h', '?'],
      type: 'boolean',
    },
  },
});

if (config.help) {
  console.log('Todo, just see this for now:', require('fs').readFileSync(__filename, 'utf8'));
  process.exit(0);
}

const mode = config.mode || config._.find(_ => _ === 'server' || 'client' === _);
if (!mode || (mode !== 'server' && 'client' !== mode)) {
  console.error('Need a mode to run in: [server|client]');
  process.exit(1);
} else {
  config.mode = mode;
}

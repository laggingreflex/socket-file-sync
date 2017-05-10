const Config = require('configucius').default;

const main = module.exports = new Config({
  configFile: '~/.socket-file-sync',
  options: {
    secret: {
      type: 'string',
      save: true,
      prompt: true,
    },
    port: {
      type: 'number',
      default: 50581,
      save: true,
    },
    server: {
      alias: 'mainServer',
      type: 'string',
      save: true,
      prompt: 'Main server',
    },
    cwd: {
      type: 'string',
      default: process.cwd(),
    },
    mode: {
      type: 'string',
    },
    editConfig: {
      alias: 'e',
      type: 'boolean',
    },
    help: {
      alias: ['h', '?'],
      type: 'boolean',
    },
  },
});

const project = exports.project = main.project = new Config({
  configFile: main.cwd + '/.socket-file-sync',
  options: {
    server: {
      alias: 'projectServer',
      type: 'string',
      save: true,
      prompt: 'Server for this project',
    },
    serverDir: {
      type: 'string',
      save: true,
      prompt: 'Server project dir',
    }
    saveProject: {
      type: 'boolean',
    },
  },
});

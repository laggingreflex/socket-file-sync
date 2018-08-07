module.exports = {
  secret: {
    type: 'string',
    save: true,
    prompt: true,
  },
  port: {
    type: 'number',
    default: 8081,
    save: true,
  },
  server: {
    type: 'string',
    save: true,
    prompt: config => config.mode && config.mode.charAt(0) === 'c',
  },
  serverDir: {
    type: 'string',
    save: true,
    prompt: config => Boolean(config.server),
  },
  cwd: {
    type: 'string',
    default: process.cwd(),
  },
  mode: {
    type: 'string',
  },
  saveProjectConfig: {
    type: 'boolean',
  },
  twoWay: {
    alias: 'twoway',
    type: 'boolean',
    save: true,
    prompt: true,
  },
  deleteOnRemote: {
    type: 'boolean',
    save: true,
    prompt: true,
  },
  deleteByRemote: {
    type: 'boolean',
    save: true,
    prompt: true,
  },
  editConfig: {
    alias: 'e',
    type: 'boolean',
  },
  help: {
    alias: ['h', '?'],
    type: 'boolean',
  },
};

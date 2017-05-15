const Config = require('configucius').default;

const options = {
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

const main = new Config({
  configFile: '~/.socket-file-sync',
  options,
});

const getProjectConfig = opts => {
  const newOpts = {};
  for (const key in options) {
    newOpts[key] = Object.assign({}, options[key]);
    if (typeof opts[key] !== 'undefined') {
      if (opts[key].default) {
        Object.assign(newOpts[key], opts[key])
      } else {
        newOpts[key].default = opts[key];
      }
    }
  }
  const project = new Config({
    configFile: opts.cwd + '/.socket-file-sync',
    options: newOpts,
  });
  const proxy = new Proxy(project, {
    get: (project, key) => project[key] || main[key],
  });
  project.proxy = proxy;
  return proxy;
};

main.getProjectConfig = getProjectConfig;
main.cwdConfig = getProjectConfig({ cwd: main.cwd });
main.cwdConfig.main = main;

module.exports = main;

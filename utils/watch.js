const Path = require('path');
const chokidar = require('chokidar');
const proximify = require('proximify');
const _ = require('lodash');
const untildify = require('untildify');
const parseGitignore = require('parse-gitignore');

module.exports = watch;

const ignored = _.flatten(['.git', 'node_modules']
  .concat(['.gitignore', '~/.gitignore']
    .map(untildify)
    .map(parseGitignore)));

const chokidarOptions = { ignored, };

async function watch(dir, opts) {
  opts = Object.assign({}, chokidarOptions, opts);
  const watcher = proximify(chokidar.watch(dir, opts));
  console.log('Reading current dir...');
  const initial = []
  const initialAdd = path => {
    initial.push(path);
    const len = initial.length;
    if (len >= 200 && len % 100 === 0) {
      console.warn(len + ' files added', Path.relative(cwd, path));
    }
  };
  watcher.on('add', initialAdd);
  await watcher.onceAsync('ready');
  watcher.removeListener('add', initialAdd);
  console.log(initial.length + ' files found. Watching for changes...');
  return watcher;
}

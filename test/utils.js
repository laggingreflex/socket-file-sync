const Path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const asyncBreak = require('break-async-iterator');
const snapshot = require('fs-restore');
const cpStream = require('cp-async-stream');

const utils = exports;

utils.bin = (args, opts) => fork(__dirname + '/../bin', args, {
  stdio: 'pipe',
  // stdio: 'inherit',
  ...opts,
});

utils.asyncBin = async function*(args, opts) {
  const cp = utils.bin(args, opts);
  try {
    for await (const { stdout, stderr } of cpStream(cp)) {
      const line = stdout || stderr;
      if (line.includes('Debugger listening')) { continue; }
      if (line.includes('nodejs.org/en/docs/inspector')) { continue; }
      yield line;
    }
  } finally {
    cp.send('STOP');
    // cp.kill();
  }
};

utils.sc = (label, cb, misc = {}) => {
  const _ = ['server', 'client'].reduce((__, sc) => {
    const _ = __[sc] = {};
    _.testDir = (...paths) => Path.join(__dirname, `/test-dir/${sc}`, ...paths);

    _.restore = [];
    _.testDirRead = (...paths) => fs.readFileSync(_.testDir(...paths), 'utf8');
    _.testDirWrite = (...paths) => data => {
      const path = _.testDir(...paths);
      const org = fs.readFileSync(path, 'utf8');
      fs.writeFileSync(path, data);
      _.restore.push(() => fs.writeFileSync(path, org))
    };
    _.start = (...args) => opts => {
      args = ttl(...args);
      _.iterator = utils.asyncBin([sc, ...args], { cwd: _.testDir(), ...opts });
    };
    _.next = v => _.iterator.next(v).then(({ value }) => value);
    return __;
  }, {});

  return describe(label, function() {
    this.timeout(5000)
    let s;
    before(() => {
      misc.before && misc.before();
      s = snapshot('test/test-dir');
    });
    it(label, cb(_));
    after(() => {
      // console.log(`snapshot:`, snapshot);
      for (const sc in _) {
        try { _[sc].iterator.return(sc); } catch (e) {}
        for (const fn of _[sc].restore) {
          fn(sc);
          // try { fn(sc); } catch (e) {}
        }
      }
      misc.after && misc.after();
      s.restore();
    });
  });
}

function ttl(strings, ...vars) {
  const ret = [];
  for (const string of strings) {
    ret.push(...string.split(/ +/g).map(_ => _.trim()).filter(Boolean));
    if (vars.length) {
      ret.push(vars.shift());
    }
  }
  return ret;
}


// if (typeof describe === 'undefined') {
//   global.describe = (label, fn) => {
//     console.log(label);
//     // const fn();
//   }
// }

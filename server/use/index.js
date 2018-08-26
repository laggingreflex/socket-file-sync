const exp = _ => exports[_] = require('./' + _);

exp('config');
exp('error');
exp('log');

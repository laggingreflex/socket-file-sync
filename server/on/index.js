const exp = _ => exports[_] = require('./' + _);

exp('connection');

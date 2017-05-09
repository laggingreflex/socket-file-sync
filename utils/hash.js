const hashifier = require('hashifier');

exports.hash = hash;
exports.compare = compare;

const defaults = {
  iterations: 1000,
  algorithm: 'sha512',
  encoding: 'hex',
  saltLength: 128,
  keyLength: 128,
};

async function hash(text, opts) {
  opts = Object.assign({}, opts, defaults);
  const { hash, salt } = await hashifier.hash(text, opts);
  return hash + ':' + salt;
}

function compare(text, saltedHash, opts) {
  opts = Object.assign({}, opts, defaults);
  const [hash, salt] = saltedHash.split(':');
  return hashifier.compare(text, hash, salt, opts);
}

const hash = require('./hash');
const config = require('../config');

exports.get = get;
exports.verify = verify;

async function get() {
  if (config.secret) return config.secret;
  await config.prompt('secret');
  if (!config.secret) {
    throw new Error('Must enter a secret');
  }
  config.secret = await hash.hash(config.secret);
  await config.save();
  return config.secret;
}

async function verify(text) {
  return hash.compare(text, await get());
}

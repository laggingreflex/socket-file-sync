const config = require('../config');

exports.get = get;

async function get() {
  if (!config.secret) {
    await config.prompt('secret', { required: true });
  }
  await config.save();
  return config.secret;
}

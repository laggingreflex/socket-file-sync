const utils = exports;

Object.assign(utils, require('../utils'))

utils.handler = (handler, { onMessage }) => async argv => {
  try {
    const iterator = require('../../server')(argv);

    await handler(argv);
    // process.exit(0);
  } catch (error) {
    // try after.catch
    // throw error
    if (error instanceof utils.Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    // process.exit(1);
  }
}

const offs = [];
utils.onMessage = handler => {
  const onMessage = message => {
    console.log('!!!')
    try {
      handler[message]();
    } catch (error) {
      console.error(error);
    }
  }
  process.on('message', onMessage);
  const off = () => process.off('message', onMessage);
  offs.push(off);
  return () => offs.forEach(off => off());
}

utils.fail = (msg, error, yargs) => {
  if (error instanceof utils.Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
};

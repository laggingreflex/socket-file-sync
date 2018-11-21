const { assert } = require('chai');
const utils = require('../utils');

describe('CLI', () => {
  utils.sc(`client gets rejected when path relative`, ({ server, client }) => async () => {
    server.start `-s aaa`();
    assert.include(await server.next(), `Listening for`);
    client.start `-s aaa localhost some/relative/path`();
    assert.include(await client.next(), `Server error: Invalid {remoteDir: 'some/relative/path'} (path must be /absolute, or relative to home ~/)`);
  });
});

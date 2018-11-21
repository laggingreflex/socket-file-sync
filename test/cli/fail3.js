const { assert } = require('chai');
const utils = require('../utils');

describe('CLI', () => {
  utils.sc(`client gets rejected when path doesn't exist`, ({ server, client }) => async () => {
    server.start `-s aaa`();
    assert.include(await server.next(), `Listening for`);
    client.start `-s aaa localhost ${`/shouldn't/exist`}`();
    assert.include(await client.next(), `Server error: Invalid {remoteDir: '/shouldn't/exist'}. ENOENT: no such file or directory, access`);
  });
});

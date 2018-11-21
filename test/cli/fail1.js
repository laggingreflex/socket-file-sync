const { assert } = require('chai');
const utils = require('../utils');

describe('CLI', () => {
  utils.sc(`client gets rejected when secret is wrong`, ({ server, client }) => async () => {
    server.start `-s aaa`();
    assert.include(await server.next(), `Listening for`);
    client.start `-s bbb localhost ${server.testDir()}`();
    assert.include(await client.next(), `Server error: Couldn\'t decrypt`);
  });
});

const { assert } = require('chai');
const utils = require('../utils');

describe('CLI', () => {
  utils.sc(`everything works`, ({ server, client }) => async () => {
    server.start `-s aaa`();
    assert.include(await server.next(), `Listening for`);
    client.start `-s aaa localhost ${server.testDir()}`();
    assert.include(await client.next(), `Syncing: ${client.testDir()}`);
    assert.include(await client.next(), `With ->: ${server.testDir()} (on localhost`);
    assert.include(await server.next(), `Syncing with: ${server.testDir()}`);
    assert.include(await client.next(), `Syncing 2 files...`);
    assert.include(await client.next(), `Same contents`);
    assert.include(await client.next(), `Same contents`);
    assert.include(await server.next(), `Same contents`);
    assert.include(await server.next(), `Same contents`);

    assert.equal(client.testDirRead('test.txt'), 'test');
    client.testDirWrite('test.txt')('changed');

    assert.include(await client.next(), `Syncing 1 files...`);
    assert.include(await client.next(), `[1/1] Synced: test.txt`);
    assert.include(await server.next(), `Synced: ${server.testDir('test.txt')}`);

    assert.equal(server.testDirRead('test.txt'), 'changed');
  });
});

module.exports = {
  secret: {
    alias: ['s'],
    type: 'string',
    required: true,
    description: 'Secret to use while handshaking and encrypting files',
  },
  port: {
    type: 'number',
    default: 8081,
    description: 'Port to run server on and client to connect to',
  },
  twoWay: {
    alias: ['2'],
    type: 'boolean',
    description: 'Sync both ways. Both remotes (server & client) must have set this for it to work',
  },
  deleteOnRemote: {
    type: 'boolean',
    description: 'Delete on remote. Remote must have set `deleteByRemote`',
  },
  deleteByRemote: {
    type: 'boolean',
    description: 'Let remote delete',
  },
};

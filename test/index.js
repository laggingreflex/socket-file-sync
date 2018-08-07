const server = require('../server');
const client = require('../client');
const { getConfig } = require('../config');

const config = getConfig(__dirname + '/test-dir');
console.log(`config.secret:`, config.secret);
// config.cwdConfig = config;
// config.getCwdConfig = () => config;
// config.server = 'http://localhost';
// config.port = 8081;
// config.serverDir = config.cwd = __dirname + '/test-dir';
// config.secret = 'secret';

const serverConfig = config.getConfig(__dirname + '/test-dir/server');
const clientConfig = config.getConfig(__dirname + '/test-dir/client');
console.log(`clientConfig.secret:`, clientConfig.secret);

server(serverConfig).catch(onError);
client(clientConfig).catch(onError);

function onError(error) { console.error(error); }

// server({
//   ...config,
//   cwd: __dirname + '/test-dir/server',
// }).catch(console.error);
// client({
//   ...config,
//   cwd: __dirname + '/test-dir/client',
//   serverDir: __dirname + '/test-dir/server',
// }).catch(console.error);

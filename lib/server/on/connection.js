const Path = require('path');
const fs = require('fs-extra');
module.exports = config => socket => {
  const { clientConfig } = socket;

  socket.log('Syncing with:', clientConfig.remoteDir);

  socket.on('error', socket.log.error);

  socket.on('file', async (_) => {
    let label = _;
    try {
      if (!_ || !_.file) throw new Error(`Invalid data received for 'file' event`);
      const { file, event, data } = _;
      label = { file };
      if (!data) throw new Error('No data');
      const fileOnServer = Path.join(clientConfig.remoteDir, Path.isAbsolute(file) ? Path.relative(clientConfig.cwd, file) : file);
      const org = await fs.readFile(fileOnServer, 'utf8').catch(() => {});
      if (data === org) throw new Error('Same contents');
      await fs.outputFile(fileOnServer, data);
      socket.log(`Synced:`, fileOnServer);
    } catch (error) {
      socket.log.error('Error:', error.message, label);
      throw error;
    }
  });
}

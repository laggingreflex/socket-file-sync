const os = require('os');
const merge = require('merge');
const fs = require('fs-extra');
const Path = require('path');
const shortid = require('shortid');
const sss = require('simple-socket-stream')
const streamEqual = require('stream-equal');

const filesInTransit = {};

module.exports = (socket, root, pre) => {
  const initiate = sss(socket,
    tryCatch(socket, (stream, { relative } = {}) => {
      root = parseRootDir(root)
      const full = Path.join(root, relative);
      if (filesInTransit[full]) {
        throw new Error('File already in transit');
      }
      filesInTransit[full] = true;
      if (pre) pre('send', { relative, full });
      console.log('Sending:', relative);
      fs.createReadStream(full).pipe(stream);
      stream.once('end', () => {
        console.log('Sent', relative);
        socket.emit('send-file:response', null, { relative, full });
      });
      stream.once('error', (error) => {
        console.log('Sending failed:', relative, error.message);
        socket.emit('send-file:response', error.message, { relative, full });
      });
    }),
    tryCatch(socket, (stream, { relative } = {}) => {
      root = parseRootDir(root);
      const full = Path.join(root, relative);
      if (filesInTransit[full]) {
        throw new Error('File already in transit');
      }
      filesInTransit[full] = true;
      if (pre) pre('receive', { relative, full });
      const tmp = Path.join(os.tmpdir(), shortid.generate());
      const bkp = Path.join(os.tmpdir(), shortid.generate());
      const bkpCopyPromise = fs.copy(full, bkp);
      console.log('Receiving', relative);
      console.log('Writing to temporary path:', tmp);
      stream.pipe(fs.createWriteStream(tmp));
      stream.once('end', async() => {
        const throwError = e => {
          console.error(e);
          socket.emit('receive-file:response', e, { relative, full });
        }
        console.log('Received', relative);
        try {
          await bkpCopyPromise;
        } catch (error) {
          console.error('Backup failed', error.message, '\nContinuing anyway');
        }

        if (await streamEqual(
            fs.createReadStream(full),
            fs.createReadStream(tmp)
          )) {
          console.warn('Skipping copying', full);
          throwError('Same contents');
          return;
        }

        try {
          await fs.remove(full)
        } catch (error) {
          const err = 'Failed to remove original file. ' + error.message
          console.error(err);
          socket.emit('receive-file:response', err, { relative, full });
          return;
        }
        try {
          await fs.rename(tmp, full);
        } catch (error) {
          const err = 'Failed to rename new file to original. ' + error.message + '\nContinuing to replace by moving';
          console.error(err);
          socket.emit('receive-file:response', err, { relative, full });
          try {
            await fs.move(tmp, full);
          } catch (error) {
            const err = 'Failed to move new file to original. ' + error.message + '\nContinuing to replace by copying';
            console.error(err);
            socket.emit('receive-file:response', err, { relative, full });
            try {
              await fs.copy(tmp, full);
            } catch (error) {
              const err = 'Failed to copy new file to original. ' + error.message + '\nAboring';
              console.error(err);
              socket.emit('receive-file:response', err, { relative, full });
              return;
            }
          }
        }
        try {
          await Promise.all([tmp, bkp].map(_ => fs.remove(_)));
        } catch (error) {
          const err = 'Failed to remove backup or temporary file. ' + error.message;
          console.error(err);
          socket.emit('receive-file:response', err, { relative, full });
        }
        socket.emit('receive-file:response', null, { relative });
      });
      stream.once('error', error => {
        console.log('Receiving failed:', relative, error.message);
        // socket.emit('stream-file:response', error.message, { relative });
        socket.emit('receive-file:response', error.message, { relative, full });
      });
    })
  );

  socket.on('send-file:response', (error, { relative } = {}) => error
    ? console.error('Sending failed by remote:', relative, error)
    : console.log('Sent by remote successfully:', relative));
  socket.on('receive-file:response', (error, { relative } = {}) => error
    ? console.error('Send failed on remote:', relative, error)
    : console.log('Sent successfully:', relative));

  socket.on('send-file:response', (error, { relative } = {}) => {
    root = parseRootDir(root);
    const full = Path.join(root, relative);
    delete filesInTransit[full]
  });
  socket.on('receive-file:response', (error, { relative } = {}) => {
    root = parseRootDir(root);
    const full = Path.join(root, relative);
    delete filesInTransit[full]
  });

  return tryCatch(socket, ({ relative } = {}) => {
    relative = relative.replace(/[\/\\]+/g, '/');
    root = parseRootDir(root)
    const full = Path.join(root, relative);
    if (filesInTransit[full]) {
      throw new Error('File already in transit');
    }
    return initiate({ relative });
  });

}

function parseRootDir(root) {
  if (typeof root === 'function') {
    root = root();
  }
  if (!root) {
    throw new Error('Base dir not found');
  }
  return root;
}

function tryCatch(socket, fn) {
  return (...args) => {
    try {
      return fn(...args)
    } catch (error) {
      socket.emit('send-file:response', error.message, args.slice(1));
      console.error(error);
    }
  }
}

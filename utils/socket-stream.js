const os = require('os');
const merge = require('merge');
const fs = require('fs-extra');
const Path = require('path');
const shortid = require('shortid');
const sss = require('simple-socket-stream')

module.exports = (socket, root, pre) => {
  const initiate = sss(socket,
    tryCatch(socket, (stream, { relative } = {}) => {
      root = parseRootDir(root)
      const full = Path.join(root, relative);
      if (pre) pre('send', { relative, full });
      console.log('Sending:', relative);
      fs.createReadStream(full).pipe(stream);
      stream.once('end', () => {
        console.log('Sent', relative);
        socket.emit('send-file:response', null, { relative });
      });
      stream.once('error', (error) => {
        console.log('Sending failed:', relative, error.message);
        socket.emit('send-file:response', error.message, { relative });
      });
    }),
    tryCatch(socket, (stream, { relative } = {}) => {
      root = parseRootDir(root);
      const full = Path.join(root, relative);
      if (pre) pre('receive', { relative, full });
      const tmp = Path.join(os.tmpdir(), shortid.generate());
      console.log('Receiving', relative);
      console.log('Writing to temporary path:', tmp);
      stream.pipe(fs.createWriteStream(tmp));
      stream.once('end', async() => {
        console.log('Received', relative);
        // fs.rename(tmp, path);
        // socket.emit('stream-file:response', null, { relative });
        socket.emit('receive-file:response', null, { relative });
      });
      stream.once('error', error => {
        console.log('Receiving failed:', relative, error.message);
        // socket.emit('stream-file:response', error.message, { relative });
        socket.emit('receive-file:response', error.message, { relative });
      });
    })
  );

  socket.on('send-file:response', (error, { relative } = {}) => error
    ? console.error('Sending failed by remote:', relative, error)
    : console.log('Sent by remote successfully:', relative));
  socket.on('receive-file:response', (error, { relative } = {}) => error
    ? console.error('Send failed on remote:', relative, error)
    : console.log('Sent successfully:', relative));

  return ({ relative } = {}) => {
    relative = relative.replace(/[\/\\]+/g, '/');
    return initiate({ relative });
  }

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
      socket.emit('send-file:response', error.message);
      console.error(error);
    }
  }
}

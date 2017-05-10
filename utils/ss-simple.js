const os = require('os');
const fs = require('fs-extra');
const Path = require('path');
const shortid = require('shortid');
const ss = require('socket.io-stream');

const sss = (socket, send, receive) => {
  const streamSocket = ss(socket);

  // 2. receiver upon seeing this request,
  // creates a writable socket stream to which the sender can now pipe
  // and sends this steam object to the sender
  socket.on('send-file', data => {
    const stream = ss.createStream();
    streamSocket.emit('stream-file', stream, data);

    // 4. receiver can take this stream and write it to a file
    receive(stream, data);
  });


  // 3. sender now has a channel on which he can push whatever he wanted to send
  streamSocket.on('stream-file', (stream, data) => {
    send(stream, data)
  });


  // 1. sender wants to send a file - he just calls this function
  return data => socket.emit('send-file', data)
}


module.exports = (socket, root) => sss(socket,
  function send(stream, { relative }) {
    relative = relative.replace(/[\/\\]+/g, '/');
    const full = Path.join(root(), relative);

    console.log('Sending:', full);
    fs.createReadStream(full).pipe(stream);
    stream.once('end', () => {
      console.log('Sent', relative);
    });
    stream.once('error', (error) => {
      console.log('Sending failed:', relative, error.message);
    });
  },
  async function receive(stream, { relative }) {
    relative = relative.replace(/[\/\\]+/g, '/');
    const full = Path.join(root(), relative);
    const tmp = Path.join(os.tmpdir(), shortid.generate());

    console.log('Receiving', relative);
    console.log('Writing to temporary path:',tmp);
    stream.pipe(fs.createWriteStream(tmp));

    stream.once('end', async() => {
      console.log('Received', relative);
      // fs.rename(tmp, path);
    });
    stream.once('error', () => {
      console.log('Receiving failed:', relative, error.message);
    });
  }
)

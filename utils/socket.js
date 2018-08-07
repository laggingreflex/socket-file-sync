const proximify = require('proximify');
const acknowledge = require('socket.io-acknowledge')

module.exports = socket => {
  socket = proximify(socket);



  const on = socket.on;
  socket.on = (msg, fn) => on.call(socket, msg, async function(...args) {
    try {
      await fn.call(this, ...args);
    } catch (error) {
      console.error(error.message);
      socket.emit(msg + ':response', error.message, ...args);
    }
  });
  return socket;
}

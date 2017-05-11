const proximify = require('proximify');

module.exports = socket => {
  socket = proximify(socket);
  // socket.on = new Proxy(socket.on, {
  //   apply: (on, socket, args) => (msg, fn) =>
  //     on.call(socket, msg,
  //       async(...args) => {
  //         try {
  //           await fn(...args);
  //         } catch (error) {
  //           console.error(error.message);
  //           socket.emit(msg + ':response', error.message, ...args);
  //         }
  //       }),
  // });
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

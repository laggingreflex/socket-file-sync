module.exports = config => async socket => {
  socket.log = (...msg) => console.log(`[${socket.id}]`, ...msg);
  socket.log.error = (...msg) => console.log(`[${socket.id}]`, ...msg);
};

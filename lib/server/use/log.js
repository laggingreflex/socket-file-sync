module.exports = config => async socket => {
  const label = `[${socket.id}]`;
  const log = (level, ...message) => {
    // process[level === 'error' ? 'stderr' : 'stdout'].write(label + ' ');
    // console[level](...message);
    console[level](label, ...message);
  }
  socket.log = new Proxy(() => {}, {
    // get: (_, log) => (...message) => console[log](label, ...message),
    // apply: (_, __, message) => console.log(label, ...message),
    get: (_, level) => (...message) => log(level, ...message),
    apply: (_, __, message) => log('log', ...message),
  })
  // socket.log = (...msg) => console.log(`[${socket.id}]`, ...msg);
  // socket.log.error = (...msg) => console.log(`[${socket.id}]`, ...msg);
};

const cluster = require('cluster');

module.exports = fn => {
  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    cluster.fork();
    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    console.log(`Worker ${process.pid} started`);
    fn();
  }
}

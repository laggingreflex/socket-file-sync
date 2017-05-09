import fs from 'fs';
import { Writable } from 'stream';
import pino from 'pino';
import ms from 'pretty-ms';
import koa from 'koa-pino-logger';

const logInDocument = ['name', 'title', 'username', 'email', 'term'];

const file = fs.createWriteStream('.log', { flags: 'a' });
const stdout = pino.pretty({
  // formatter: v => `  ${v.name}:${pino.levels.labels[v.level].padEnd(5)} ${v.msg} [${v.time}]`
  formatter(v) {
    if (!v) {
      return;
    }
    // let txt = `  ${v.name}:${pino.levels.labels[v.level].padEnd(5)}`;
    let txt = `  ${v.name}:${pino.levels.labels[v.level]}`;
    txt += ` [${v.time}]`;
    if (v.id) {
      txt += ` {${v.id}}`;
    }
    if (v.req) {
      const { req, res, err, responseTime } = v;
      txt += ` ${req.url}`;
      if (req.method !== 'GET') {
        txt += ` ${req.method}`;
      }
      if (res) {
        txt += ` [${res.statusCode}]`;
      }
      if (responseTime) {
        txt += ` (${ms(responseTime)})`;
      }
      if (err) {
        txt += ` Error: ${err.message}`;
      }
    }
    if (v.document) {
      txt += ` [${v.document._id || '?'}]`;
      const ctx = Object.keys(v.document).find(e => logInDocument.includes(e));
      if (ctx) {
        txt += `(${v.document[ctx]})`;
      }
    }
    txt += ` ${v.msg}`;
    return txt;
  }
});
stdout.pipe(process.stdout);
const tee = new Writable({
  write(chunk, encoding, done) {
    stdout.write(chunk, encoding);
    file.write(chunk, encoding, done);
  }
});

export const createLogger = opts => pino(opts, tee);
export const createKoaLogger = (name = 'req') => koa({ name }, tee);

export const server = createLogger({ name: 'server' });
server.koa = createKoaLogger('server:req');

export const client = createLogger({ name: 'client' });
client.koa = createKoaLogger('client:req');

export const db = createLogger({ name: 'db' });

export default createLogger({ name: 'app' });

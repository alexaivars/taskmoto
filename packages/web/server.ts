import 'dotenv/config';
import { readFileSync } from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import { createRequestListener } from 'remix/node-fetch-server';
import { router } from './app/router.ts';
const listener = createRequestListener(router.fetch);
function pem(name: string): string | undefined {
  const value = process.env[name];
  const file = process.env[`${name}_FILE`];
  return value || (file ? readFileSync(file, 'utf8') : undefined);
}
const key = pem('SSL_PRIVATE_KEY');
const cert = pem('SSL_CERTIFICATE');
if (Boolean(key) !== Boolean(cert))
  throw new Error('Provide both TLS key and certificate');
const tls = key && cert ? { key, cert } : undefined;
const server = tls
  ? https.createServer(tls, listener)
  : http.createServer(listener);
const port = Number(process.env.WEB_PORT ?? 3000);
server.listen(port, process.env.HOST ?? '127.0.0.1', () =>
  console.log(
    `Taskmoto web ready on ${tls ? 'https' : 'http'}://localhost:${port}`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  });

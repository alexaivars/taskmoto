import 'dotenv/config';
import { readFileSync } from 'node:fs';

function optionalKey(name: string): string | undefined {
  const value = process.env[name];
  const file = process.env[`${name}_FILE`];
  if (value) return value;
  if (file) return readFileSync(file, 'utf8');
  return undefined;
}
function key(name: string): string {
  const value = optionalKey(name);
  if (!value) throw new Error(`Provide ${name} or ${name}_FILE`);
  return value;
}
export function loadConfig() {
  const tlsKey = optionalKey('SSL_PRIVATE_KEY');
  const tlsCertificate = optionalKey('SSL_CERTIFICATE');
  if (Boolean(tlsKey) !== Boolean(tlsCertificate))
    throw new Error('Provide both TLS key and certificate');
  const tls =
    tlsKey && tlsCertificate
      ? { key: tlsKey, cert: tlsCertificate }
      : undefined;
  if (process.env.NODE_ENV === 'production' && !process.env.WEB_ORIGIN)
    throw new Error('WEB_ORIGIN is required in production');
  return {
    signingKey: key('JWT_ACCESS_TOKEN_SECRET'),
    publicKey: key('JWT_ACCESS_TOKEN_PUBLIC'),
    tls,
    secureCookies: process.env.NODE_ENV === 'production' || Boolean(tls),
    webOrigin:
      process.env.WEB_ORIGIN ?? `${tls ? 'https' : 'http'}://localhost:3000`,
    redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    port: Number(process.env.API_PORT ?? 8443),
    host: process.env.HOST ?? '127.0.0.1',
  };
}
export type Config = ReturnType<typeof loadConfig>;

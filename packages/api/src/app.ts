import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import mercurius from 'mercurius';
import type { Redis } from 'ioredis';
import type { Config } from './config.ts';
import UserAPI from './datasources/UserAPI.ts';
import ReportAPI from './datasources/ReportAPI.ts';
import { authenticate, type Identity } from './session.ts';
import { schema, type Context } from './schema.ts';
import { registerPasskeys } from './passkeys.ts';

declare module 'fastify' {
  interface FastifyRequest {
    identity: Identity | undefined;
  }
}
export async function createApp(store: Redis, config: Config, logger = true) {
  const app = Fastify({
    logger,
    ...(config.tls ? { https: config.tls } : {}),
    bodyLimit: 65536,
  });
  const users = new UserAPI(store);
  await app.register(cookie);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.decorateRequest('identity', undefined);
  app.addHook('preValidation', async (request, reply) => {
    const passkeys = request.url.startsWith('/passkeys/');
    if (!request.url.startsWith('/graphql') && !passkeys) return;
    // Same-origin UI proxy preserves the browser Origin. Non-browser API clients may omit it.
    if (
      (passkeys || request.headers.origin) &&
      request.headers.origin !== config.webOrigin
    ) {
      return reply.code(403).send({ error: 'Origin is not allowed' });
    }
    if (
      request.method === 'POST' &&
      !request.headers['content-type']?.startsWith('application/json')
    ) {
      return reply
        .code(415)
        .send({ error: 'GraphQL requires application/json' });
    }
    request.identity = await authenticate(request, reply, users, config);
  });
  app.addHook('onSend', async (request, reply) => {
    if (request.url.startsWith('/passkeys/'))
      reply.header('cache-control', 'no-store');
  });
  registerPasskeys(app, users, config);
  await app.register(mercurius, {
    schema,
    graphiql: process.env.NODE_ENV !== 'production',
    queryDepth: 10,
    context: (request, reply): Context => ({
      users,
      reply,
      config,
      identity: request.identity,
      reports: request.identity
        ? new ReportAPI(store, request.identity.userId)
        : undefined,
    }),
  });
  app.get('/health', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        store.ping(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('Readiness timeout')),
            1500,
          );
        }),
      ]);
      if (result !== 'PONG') throw new Error('Redis unavailable');
      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    } finally {
      clearTimeout(timer);
    }
  });
  return app;
}

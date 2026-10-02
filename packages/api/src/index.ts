import { Redis } from 'ioredis';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
const config = loadConfig();
const store = new Redis(config.redisUrl, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});
store.on('error', () => console.error('Redis connection unavailable'));
const app = await createApp(store, config);
app.addHook('onClose', async () => {
  await store.quit();
});
await app.listen({ port: config.port, host: config.host });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });

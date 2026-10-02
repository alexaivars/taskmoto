import { Redis } from 'ioredis';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
const config = loadConfig();
const store = new Redis(config.redisUrl);
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

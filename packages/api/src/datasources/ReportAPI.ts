import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import type { TimeEntry } from '../models.ts';

function entryFromHash(hash: Record<string, string>): TimeEntry {
  if (!hash.id) throw new Error('Entry not found');
  return {
    __typename: 'TimeEntry',
    id: hash.id,
    minutes: Number(hash.minutes),
    name: hash.name,
  };
}
export default class ReportAPI {
  private scope: string;
  constructor(
    private store: Redis,
    userId: string,
  ) {
    if (!userId) throw new Error('Login required');
    this.scope = `USER:${userId}:ENTRY`;
  }
  async createLog(minutes: number, name: string): Promise<TimeEntry> {
    if (!Number.isSafeInteger(minutes) || minutes <= 0 || minutes > 2147483647)
      throw new Error('Minutes must be a positive integer');
    if (name.length > 500)
      throw new Error('Keep the description within 500 characters');
    const id = randomUUID();
    const entry: TimeEntry = { __typename: 'TimeEntry', id, minutes, name };
    const result = await this.store
      .multi()
      .hset(`${this.scope}:${id}`, { id, minutes: String(minutes), name })
      .zadd(`${this.scope}:ALL`, Date.now(), id)
      .exec();
    if (!result || result.some(([error]) => error))
      throw new Error('Could not save entry');
    return entry;
  }
  async deleteEntry(id: string): Promise<TimeEntry> {
    const hash = (await this.store.eval(
      `
      local data = redis.call('HGETALL', KEYS[1])
      if #data == 0 then return data end
      redis.call('ZREM', KEYS[2], ARGV[1])
      redis.call('DEL', KEYS[1])
      return data`,
      2,
      `${this.scope}:${id}`,
      `${this.scope}:ALL`,
      id,
    )) as string[];
    return entryFromHash(
      Object.fromEntries(
        Array.from({ length: hash.length / 2 }, (_, i) => [
          hash[i * 2],
          hash[i * 2 + 1],
        ]),
      ),
    );
  }
  async getEntries(): Promise<TimeEntry[]> {
    const ids = await this.store.zrevrange(`${this.scope}:ALL`, 0, -1);
    if (!ids.length) return [];
    const pipeline = this.store.pipeline();
    ids.forEach((id) => pipeline.hgetall(`${this.scope}:${id}`));
    const rows = await pipeline.exec();
    if (!rows) throw new Error('Could not load entries');
    return rows.flatMap(([error, data]) => {
      if (error) throw error;
      const hash = data as Record<string, string>;
      return hash.id ? [entryFromHash(hash)] : [];
    });
  }
}

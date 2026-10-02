import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { TimeEntry } from '../generated/types';

const entryFromHash = (hash: { [key: string]: string }): TimeEntry => {
  return {
    __typename: 'TimeEntry',
    id: hash.id,
    minutes: parseInt(hash.minutes, 10),
    name: hash.name,
  };
};

class ReportAPI {
  store: Redis;
  namespace: string;

  constructor({ store, userId }: { store: Redis; userId?: string }) {
    this.store = store;
    this.namespace = userId ? `USER:${userId}` : '';
  }

  async newEntryId(): Promise<string> {
    const keyScope = `${this.namespace}:ENTRY`;
    let exists = 0;
    let id: string;
    do {
      id = randomUUID();
      exists = await this.store.exists(`${keyScope}:${id}`);
    } while (exists);
    return id;
  }

  async createLog(minutes: number, name: string): Promise<TimeEntry> {
    const id: string = await this.newEntryId();
    const scope = `${this.namespace}:ENTRY`;
    const entry: TimeEntry = {
      __typename: 'TimeEntry',
      id,
      minutes,
      name,
    };

    const pairs: string[] = [
      'id',
      entry.id,
      'minutes',
      String(entry.minutes),
      'name',
      entry.name,
    ];

    await this.store.hset(`${scope}:${id}`, ...pairs);
    await this.store.zadd(`${scope}:ALL`, 'NX', Date.now(), id);
    return entry;
  }

  async getEntryById(id: string): Promise<TimeEntry> {
    const scope = `${this.namespace}:ENTRY`;
    const hash = await this.store.hgetall(`${scope}:${id}`);
    const entry = entryFromHash(hash);
    await this.store.zrem(`${scope}:ALL`, id);
    await this.store.del(`${scope}:${id}`);
    return entry;
  }

  async getEntries(cursor = '0', count = 10): Promise<[string, TimeEntry[]]> {
    const scope = `${this.namespace}:ENTRY`;
    const [nextCursor, elements]: [string, string[]] = await this.store.zscan(
      `${scope}:ALL`,
      cursor,
      'COUNT',
      count,
    );

    const keys: string[] = elements.filter((_value, index) => !(index % 2));
    const pipeline = this.store.pipeline();
    keys.forEach((key) => pipeline.hgetall(`${scope}:${key}`));
    const entries = ((await pipeline.exec()) ?? []) as [
      Error | null,
      { [key: string]: string },
    ][];

    const result: [string, TimeEntry[]] = [
      nextCursor,
      entries.map(
        ([_err, hash]: [Error | null, { [key: string]: string }]): TimeEntry =>
          entryFromHash(hash),
      ),
    ];
    return result;
  }
}

export default ReportAPI;

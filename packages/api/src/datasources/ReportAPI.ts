import { DataSource, DataSourceConfig } from 'apollo-datasource';
import { Pipeline, Redis } from 'ioredis';
import { v1 as uuid } from 'uuid';
import { IDataSources } from '..';
import { TimeEntry } from '../generated/types';

const entryFromHash = (hash: { [key: string]: string }): TimeEntry => {
  return {
    __typename: 'TimeEntry',
    id: hash.id,
    minutes: parseInt(hash.minutes, 10),
    name: hash.name,
  };
};

class ReportAPI extends DataSource {
  store: Redis;
  context?: IDataSources;
  namespace?: string;

  constructor({ store }: { store: Redis }) {
    super();
    this.store = store;
    this.namespace = '';
    this.context = undefined;
  }

  initialize(config: DataSourceConfig<IDataSources>): void {
    this.context = config.context;
    const userId: string = this.context?.res?.locals.userId;
    this.namespace = userId && `USER:${userId}`;
  }

  async newEntryId(): Promise<string> {
    const keyScope = `${this.namespace}:ENTRY`;
    let exists = 0;
    let id: string;
    do {
      id = uuid();
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

    const pairs: string[][] = Object.entries(entry).filter(
      (pair: string[]): boolean => pair[0] !== '__typename'
    );

    await this.store.hset(
      `${scope}:${id}`,
      ...pairs.reduce((a: string[], b: string[]): string[] => {
        return a.concat(b);
      })
    );
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
      'count',
      count
    );

    const keys: string[] = elements.filter((_value, index) => !(index % 2));
    const entries: [Error | null, { [key: string]: string }][] = await keys
      .reduce(
        (pipeline: Pipeline, key: string): Pipeline =>
          pipeline.hgetall(`${scope}:${key}`),
        this.store.pipeline()
      )
      .exec();

    const result: [string, TimeEntry[]] = [
      nextCursor,
      entries.map(
        ([_err, hash]: [Error | null, { [key: string]: string }]): TimeEntry =>
          entryFromHash(hash)
      ),
    ];
    return result;
  }
}

export default ReportAPI;

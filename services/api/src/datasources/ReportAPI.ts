import { DataSource } from "apollo-datasource";
import { Pipeline, Redis } from "ioredis";
import { v1 as uuid } from "uuid";
import { Context } from "..";
import { TimeEntry } from "../generated/types";

class ReportAPI extends DataSource {
  store: Redis;
  context?: Context;
  namespace?: string;

  constructor({ store }: { store: Redis }) {
    super();
    this.store = store;
    this.namespace = "";
    this.context = undefined;
  }

  initialize(config: any) {
    this.context = config.context;
    const userId: string = this.context?.res.locals.userId;
    this.namespace = userId && `USER:${userId}`;
  }

  async newEntryId() {
    const keyScope: string = `${this.namespace}:ENTRY`;
    while (true) {
      const id: string = uuid();
      const exists: number = await this.store.exists(`${keyScope}:${id}`);
      if (exists === 0) {
        return id;
      }
    }
  }

  async createLog(minutes: number, description: string) {
    const id: string = await this.newEntryId();
    const scope: string = `${this.namespace}:ENTRY`;
    const entry: TimeEntry = {
      __typename: "TimeEntry",
      id,
      minutes,
      description,
    };

    const pairs: string[][] = Object.entries(entry).filter(
      (pair: string[]): boolean => pair[0] !== "__typename"
    );

    await this.store.hset(
      `${scope}:${id}`,
      ...pairs.reduce((a: string[], b: string[]): string[] => {
        return a.concat(b);
      })
    );
    await this.store.zadd(`${scope}:ALL`, "NX", Date.now(), id);
    return entry;
  }

  async getEntries(
    cursor: string = "0",
    count: number = 10
  ): Promise<[string, TimeEntry[]]> {
    const scope: string = `${this.namespace}:ENTRY`;
    const [nextCursor, elements]: [string, string[]] = await this.store.zscan(
      `${scope}:ALL`,
      cursor,
      "count",
      count
    );

    const keys: string[] = elements.filter((_value, index) => !(index % 2));
    const entries: [
      Error | null,
      { [key: string]: string }
    ][] = await keys
      .reduce(
        (pipeline: Pipeline, key: string): Pipeline =>
          pipeline.hgetall(`${scope}:${key}`),
        this.store.pipeline()
      )
      .exec();

    const result: [string, TimeEntry[]] = [
      nextCursor,
      entries.map(
        ([_err, hash]: [
          Error | null,
          { [key: string]: string }
        ]): TimeEntry => ({
          __typename: "TimeEntry",
          id: hash.id,
          minutes: hash.minutes,
          description: hash.description,
        })
      ),
    ];
    return result;
  }
}

export default ReportAPI;

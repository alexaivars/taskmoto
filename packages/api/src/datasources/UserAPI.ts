import SecurePassword from 'secure-password';
import createError from 'http-errors';
import jwt from 'jsonwebtoken';
import { IDataSources } from '..';
import { DataSource, DataSourceConfig } from 'apollo-datasource';
import { Redis } from 'ioredis';
import { User } from '../generated/types';
import { v1 as uuid } from 'uuid';

const userFromHash = (hash: { [key: string]: string }): User => {
  const { id, username }: { id?: string; username?: string } = hash;
  return {
    __typename: 'User',
    id,
    username,
  };
};

class UserAPI extends DataSource {
  store: Redis;
  context?: IDataSources;
  pwd: SecurePassword;

  constructor({ store }: { store: Redis }) {
    super();
    this.store = store;
    this.context = undefined;
    this.pwd = new SecurePassword();
  }

  initialize(config: DataSourceConfig<IDataSources>): void {
    this.context = config.context;
  }

  async getUserHash(id: string): Promise<string> {
    const hash = await this.store.get(`USER:${id}:HASH`);
    if (!hash) {
      throw new createError.Unauthorized('User missing password');
    }
    return hash;
  }

  async getUserById(id: string): Promise<User> {
    const user: User = userFromHash(
      await this.store.hgetall(`USER:${id}:DATA`)
    );
    if (!user) {
      throw new createError.Unauthorized('User not found');
    }
    return user;
  }

  async getUserByName(username: string): Promise<User> {
    const key: string = Buffer.from(username, 'utf8').toString('base64');
    const id: string | null = await this.store.get(`NAME:ID:${key}`);
    if (!id) {
      throw new createError.Unauthorized('User not found');
    }
    const user: User = userFromHash(
      await this.store.hgetall(`USER:${id}:DATA`)
    );
    return user;
  }

  async createUserId(username: string): Promise<string> {
    const key: string = Buffer.from(username, 'utf8').toString('base64');
    let exists: number;
    let id: string;
    if (await this.store.exists(`NAME:ID:${key}`)) {
      throw new Error('Username must be unique');
    }
    do {
      id = uuid();
      exists = await this.store.exists(`USER:${id}:NAME`);
    } while (exists);
    await this.store.set(`NAME:ID:${key}`, id);
    await this.store.set(`USER:${id}:NAME`, username);
    return id;
  }

  async createUser(username: string, password: string): Promise<User> {
    const hash: Buffer = await this.pwd.hash(Buffer.from(password));
    const id: string = await this.createUserId(username);
    await this.store.set(`USER:${id}:HASH`, hash.toString('base64'));
    await this.store.hset(`USER:${id}:DATA`, 'id', id, 'username', username);
    return this.getUserById(id);
  }

  async authenticateUser(username: string, password: string): Promise<User> {
    const user: User = await this.getUserByName(username);
    const userPassword: Buffer = Buffer.from(password);
    const hash: string = await this.getUserHash(user.id);
    const result: symbol = await this.pwd.verify(
      userPassword,
      Buffer.from(hash, 'base64')
    );

    switch (result) {
      case SecurePassword.VALID_NEEDS_REHASH:
        try {
          const improvedHash = await this.pwd.hash(userPassword);
          await this.store.set(
            `USER:${user.id}:HASH`,
            improvedHash.toString('base64')
          );
          // Save improvedHash somewhere
        } catch (err) {
          console.log(err);
        }
      case SecurePassword.VALID:
        return user;
      default:
        throw new createError.Unauthorized('Invalid password');
    }
  }

  async validateToken(token: string): Promise<User> {
    const { sub: id }: { sub?: string } =
      jwt.decode(token, { json: true }) || {};
    if (id) {
      const user: User = await this.getUserById(id);
      const hash: string = await this.getUserHash(id);
      const exists: number = await this.store.exists(
        `USER:${id}:TOKEN:${token}`
      );
      const clockTimestamp: number = await this.getTimestamp();

      if (Boolean(exists) === false) {
        throw new createError.Unauthorized('Invalid token');
      }

      try {
        jwt.verify(token, hash, { clockTimestamp });
      } catch (err) {
        // console.log(err.name);
        throw new createError.Unauthorized('Invalid token');
      }
      return user;
    }
    throw new createError.Unauthorized();
  }

  async getTimestamp(): Promise<number> {
    return Number(await this.store.time());
  }

  async removeRefreshToken(userId: string, tokenId: string): Promise<number> {
    return this.store.del(`USER:${userId}:REFRESH_TOKEN:${tokenId}`);
  }

  async createRefreshToken(id: string, iat?: number): Promise<string> {
    const expiresIn: number = 60 * 60 * 24 * 7;
    const hash: string = await this.getUserHash(id);
    const jti: string = uuid();

    if (!iat) {
      iat = await this.getTimestamp();
    }

    const token: string = jwt.sign(
      {
        sub: id,
        iat,
        jti,
      },
      hash,
      { expiresIn }
    );

    this.store.set(`USER:${id}:REFRESH_TOKEN:${jti}`, token, 'ex', expiresIn);
    return token;
  }

  async createAccessToken(
    id: string,
    hash?: string,
    iat?: number
  ): Promise<string> {
    const expiresIn: number = 60 * 5;
    const sub: string = id;

    if (!hash) {
      hash = await this.getUserHash(id);
    }

    if (!iat) {
      iat = await this.getTimestamp();
    }

    const token: string = jwt.sign(
      {
        sub,
        iat,
        scope: ['user'].join(' '),
      },
      hash,
      { expiresIn, algorithm: 'RS256' }
    );

    // this.store.set(`USER:${id}:ACCESS_TOKEN:${sub}`, token, "ex", expiresIn);
    return token;
  }
}

export default UserAPI;

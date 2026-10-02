import SecurePassword from 'secure-password';
import jwt from 'jsonwebtoken';
import type { Redis } from 'ioredis';
import type { User } from '../models.ts';
import { randomUUID } from 'node:crypto';

const WEEK = 7 * 24 * 60 * 60;
export function validateUsername(username: string) {
  if (!/^[\p{L}\p{N}_.-]{3,64}$/u.test(username))
    throw new Error(
      'Use 3–64 letters, numbers, dots, underscores or hyphens for your username',
    );
}
export default class UserAPI {
  private pwd = new SecurePassword();
  constructor(public store: Redis) {}

  async getUserHash(id: string): Promise<string> {
    const hash = await this.store.get(`USER:${id}:HASH`);
    if (!hash) throw new Error('Invalid credentials');
    return hash;
  }
  async getRefreshSecret(id: string): Promise<string> {
    return (
      (await this.store.get(`USER:${id}:REFRESH_SECRET`)) ??
      this.getUserHash(id)
    );
  }
  async getUserById(id: string): Promise<User> {
    const data = await this.store.hgetall(`USER:${id}:DATA`);
    if (!data.id || !data.username) throw new Error('Invalid credentials');
    return { __typename: 'User', id: data.id, username: data.username };
  }
  async getUserByName(username: string): Promise<User> {
    const id = await this.store.get(
      `NAME:ID:${Buffer.from(username).toString('base64')}`,
    );
    if (!id) throw new Error('Invalid credentials');
    return this.getUserById(id);
  }
  async createUser(username: string, password: string): Promise<User> {
    validateUsername(username);
    if (password.length < 6 || Buffer.byteLength(password) > 1024) {
      throw new Error(
        'Use a password of at least 6 characters (at most 1024 bytes)',
      );
    }
    const hash = (await this.pwd.hash(Buffer.from(password))).toString(
      'base64',
    );
    const id = randomUUID();
    // Reserve the name and write the complete account atomically, retaining existing Redis keys.
    const created = await this.store.eval(
      `
      if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
      redis.call('SET', KEYS[1], ARGV[1])
      redis.call('SET', KEYS[2], ARGV[2])
      redis.call('SET', KEYS[3], ARGV[3])
      redis.call('HSET', KEYS[4], 'id', ARGV[1], 'username', ARGV[2])
      return 1`,
      4,
      `NAME:ID:${Buffer.from(username).toString('base64')}`,
      `USER:${id}:NAME`,
      `USER:${id}:HASH`,
      `USER:${id}:DATA`,
      id,
      username,
      hash,
    );
    if (created !== 1) throw new Error('Username is already taken');
    return this.getUserById(id);
  }
  async authenticateUser(username: string, password: string): Promise<User> {
    if (Buffer.byteLength(password) > 1024)
      throw new Error('Invalid credentials');
    let user: User;
    try {
      user = await this.getUserByName(username);
    } catch {
      // Keep the password hashing cost for an unknown account as well.
      await this.pwd.hash(Buffer.from(password));
      throw new Error('Invalid credentials');
    }
    const result = await this.pwd.verify(
      Buffer.from(password),
      Buffer.from(await this.getUserHash(user.id), 'base64'),
    );
    if (
      result !== SecurePassword.VALID &&
      result !== SecurePassword.VALID_NEEDS_REHASH
    ) {
      throw new Error('Invalid credentials');
    }
    if (result === SecurePassword.VALID_NEEDS_REHASH) {
      const hash = await this.pwd.hash(Buffer.from(password));
      await this.store.set(`USER:${user.id}:HASH`, hash.toString('base64'));
    }
    return user;
  }
  async getTimestamp(): Promise<number> {
    const [seconds] = await this.store.time();
    return Number(seconds);
  }
  async createSession(
    id: string,
    signingKey: string,
    previous?: { id: string; token: string },
  ) {
    const iat = await this.getTimestamp();
    const jti = randomUUID();
    const refreshToken = jwt.sign(
      { sub: id, iat, jti },
      await this.getRefreshSecret(id),
      { algorithm: 'HS256', expiresIn: WEEK },
    );
    const accessToken = jwt.sign(
      { sub: id, iat, jti, scope: 'user' },
      signingKey,
      { algorithm: 'RS256', expiresIn: 300 },
    );
    const key = `USER:${id}:REFRESH_TOKEN:${jti}`;
    if (previous) {
      const rotated = await this.store.eval(
        `
        if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
        redis.call('DEL', KEYS[1])
        redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
        return 1`,
        2,
        `USER:${id}:REFRESH_TOKEN:${previous.id}`,
        key,
        previous.token,
        refreshToken,
        WEEK,
      );
      if (rotated !== 1) throw new Error('Session expired');
    } else {
      await this.store.set(key, refreshToken, 'EX', WEEK);
    }
    return { accessToken, refreshToken, userId: id, tokenId: jti };
  }
  async removeRefreshToken(userId: string, tokenId: string) {
    await this.store.del(`USER:${userId}:REFRESH_TOKEN:${tokenId}`);
  }
}

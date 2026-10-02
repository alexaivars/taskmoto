import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type WebAuthnCredential,
} from '@simplewebauthn/server';
import type { Config } from './config.ts';
import UserAPI, { validateUsername } from './datasources/UserAPI.ts';
import { setSession } from './session.ts';

type StoredCredential = Omit<WebAuthnCredential, 'publicKey'> & {
  publicKey: string;
  userId: string;
  deviceType: string;
  backedUp: boolean;
};
type Challenge = {
  kind: 'registration' | 'authentication';
  challenge: string;
  userId?: string;
  username?: string;
  tokenId?: string;
};
const cookieName = 'passkeyChallenge';
const credentialKey = (id: string) => `PASSKEY:${id}`;

export function registerPasskeys(
  app: FastifyInstance,
  users: UserAPI,
  config: Config,
) {
  const rpID = new URL(config.webOrigin).hostname;
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'strict' as const,
  };
  async function remember(
    request: FastifyRequest,
    reply: FastifyReply,
    state: Challenge,
  ) {
    if (request.cookies[cookieName])
      await users.store.del(`PASSKEY_CHALLENGE:${request.cookies[cookieName]}`);
    const id = randomBytes(32).toString('base64url');
    await users.store.set(
      `PASSKEY_CHALLENGE:${id}`,
      JSON.stringify(state),
      'EX',
      300,
    );
    reply.setCookie(cookieName, id, { ...cookieOptions, maxAge: 300 });
  }
  async function consume(
    request: FastifyRequest,
    reply: FastifyReply,
    kind: Challenge['kind'],
  ) {
    reply.clearCookie(cookieName, cookieOptions);
    const id = request.cookies[cookieName];
    const raw = id && (await users.store.getdel(`PASSKEY_CHALLENGE:${id}`));
    if (!raw) throw new Error('Passkey request expired. Please try again.');
    const state = JSON.parse(raw) as Challenge;
    if (
      state.kind !== kind ||
      (state.tokenId &&
        (request.identity?.userId !== state.userId ||
          request.identity?.tokenId !== state.tokenId))
    )
      throw new Error('Passkey request expired. Please try again.');
    return state;
  }
  async function signIn(
    request: FastifyRequest,
    reply: FastifyReply,
    userId: string,
  ) {
    if (request.identity)
      await users.removeRefreshToken(
        request.identity.userId,
        request.identity.tokenId,
      );
    setSession(
      reply,
      await users.createSession(userId, config.signingKey),
      config.secureCookies,
    );
    return { ok: true };
  }
  const routeOptions = {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  };
  app.post<{ Body: { username?: string; enroll?: boolean } }>(
    '/passkeys/registration/options',
    {
      ...routeOptions,
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            username: { type: 'string', maxLength: 64 },
            enroll: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      let userId: string;
      let username: string;
      let tokenId: string | undefined;
      if (request.body.enroll) {
        if (!request.identity)
          return reply.code(401).send({ error: 'Login required' });
        userId = request.identity.userId;
        tokenId = request.identity.tokenId;
        username = (await users.getUserById(userId)).username;
      } else {
        username = request.body.username ?? '';
        try {
          validateUsername(username);
        } catch (error) {
          return reply.code(400).send({ error: (error as Error).message });
        }
        if (
          await users.store.exists(
            `NAME:ID:${Buffer.from(username).toString('base64')}`,
          )
        )
          return reply.code(400).send({ error: 'Username is already taken' });
        userId = randomUUID();
      }
      const ids = await users.store.smembers(`USER:${userId}:PASSKEYS`);
      const options = await generateRegistrationOptions({
        rpName: 'Taskmoto',
        rpID,
        userName: username,
        userID: new TextEncoder().encode(userId),
        attestationType: 'none',
        excludeCredentials: ids.map((id) => ({ id })),
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'required',
        },
      });
      await remember(request, reply, {
        kind: 'registration',
        challenge: options.challenge,
        userId,
        username,
        tokenId,
      });
      return options;
    },
  );
  app.post<{ Body: RegistrationResponseJSON }>(
    '/passkeys/registration/verify',
    routeOptions,
    async (request, reply) => {
      let state: Challenge;
      let verified: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
      try {
        state = await consume(request, reply, 'registration');
        verified = await verifyRegistrationResponse({
          response: request.body,
          expectedChallenge: state.challenge,
          expectedOrigin: config.webOrigin,
          expectedRPID: rpID,
          requireUserVerification: true,
        });
        if (!verified.verified || !verified.registrationInfo)
          throw new Error('Verification failed');
      } catch {
        return reply
          .code(400)
          .send({ error: 'Could not verify this passkey. Please try again.' });
      }
      const info = verified.registrationInfo!;
      const stored: StoredCredential = {
        ...info.credential,
        publicKey: Buffer.from(info.credential.publicKey).toString('base64url'),
        userId: state.userId!,
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
      };
      const nameKey = `NAME:ID:${Buffer.from(state.username!).toString('base64')}`;
      // Create the account and credential together, or attach only to the authenticated account.
      const result = await users.store.eval(
        `
      if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
      if ARGV[1] == 'signup' then
        if redis.call('EXISTS', KEYS[3]) == 1 then return -1 end
        redis.call('SET', KEYS[3], ARGV[2])
        redis.call('SET', KEYS[4], ARGV[3])
        redis.call('HSET', KEYS[5], 'id', ARGV[2], 'username', ARGV[3])
        redis.call('SET', KEYS[6], ARGV[4])
      elseif redis.call('HGET', KEYS[5], 'id') ~= ARGV[2] then return 0 end
      redis.call('SET', KEYS[1], ARGV[5])
      redis.call('SADD', KEYS[2], ARGV[6])
      return 1`,
        6,
        credentialKey(stored.id),
        `USER:${stored.userId}:PASSKEYS`,
        nameKey,
        `USER:${stored.userId}:NAME`,
        `USER:${stored.userId}:DATA`,
        `USER:${stored.userId}:REFRESH_SECRET`,
        state.tokenId ? 'enroll' : 'signup',
        stored.userId,
        state.username!,
        randomBytes(32).toString('base64url'),
        JSON.stringify(stored),
        stored.id,
      );
      if (result !== 1)
        return reply.code(400).send({
          error:
            result === -1
              ? 'Username is already taken'
              : 'Passkey is already registered',
        });
      return signIn(request, reply, stored.userId);
    },
  );
  app.post(
    '/passkeys/authentication/options',
    routeOptions,
    async (request, reply) => {
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'required',
      });
      await remember(request, reply, {
        kind: 'authentication',
        challenge: options.challenge,
      });
      return options;
    },
  );
  app.post<{ Body: AuthenticationResponseJSON }>(
    '/passkeys/authentication/verify',
    routeOptions,
    async (request, reply) => {
      let stored: StoredCredential;
      let previous: string;
      let info: Awaited<
        ReturnType<typeof verifyAuthenticationResponse>
      >['authenticationInfo'];
      try {
        const state = await consume(request, reply, 'authentication');
        if (typeof request.body?.id !== 'string')
          throw new Error('Invalid credential');
        const raw = await users.store.get(credentialKey(request.body.id));
        if (!raw) throw new Error('Invalid credential');
        previous = raw;
        stored = JSON.parse(raw) as StoredCredential;
        if (
          request.body.response.userHandle !==
          Buffer.from(stored.userId).toString('base64url')
        )
          throw new Error('Invalid user handle');
        const verified = await verifyAuthenticationResponse({
          response: request.body,
          expectedChallenge: state.challenge,
          expectedOrigin: config.webOrigin,
          expectedRPID: rpID,
          requireUserVerification: true,
          credential: {
            ...stored,
            publicKey: new Uint8Array(
              Buffer.from(stored.publicKey, 'base64url'),
            ),
          },
        });
        if (!verified.verified) throw new Error('Verification failed');
        info = verified.authenticationInfo;
      } catch {
        return reply
          .code(400)
          .send({ error: 'Could not verify this passkey. Please try again.' });
      }
      await users.getUserById(stored.userId);
      const updated = JSON.stringify({
        ...stored,
        counter: info.newCounter,
        backedUp: info.credentialBackedUp,
      });
      const saved = await users.store.eval(
        `
      if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
      redis.call('SET', KEYS[1], ARGV[2])
      return 1`,
        1,
        credentialKey(stored.id),
        previous,
        updated,
      );
      if (saved !== 1)
        return reply
          .code(400)
          .send({ error: 'Passkey changed. Please try again.' });
      return signIn(request, reply, stored.userId);
    },
  );
}

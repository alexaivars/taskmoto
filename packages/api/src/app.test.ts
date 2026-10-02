import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import { createApp } from './app.ts';
import type { Config } from './config.ts';
import { print } from 'graphql';
import { passkeyFixture } from './passkey-fixture.ts';
import {
  Signup,
  Login,
  Me,
  Entries,
  Logout,
  ReportTime,
  DeleteTime,
} from '../../graphql/src/operations.ts';

let directory: string;
let redisProcess: ChildProcess;
let store: Redis;
let app: Awaited<ReturnType<typeof createApp>>;
let config: Config;
const credentials = {
  username: 'migration-user',
  password: 'a-long-test-password',
};
function cookieHeader(response: {
  cookies: { name: string; value: string }[];
}) {
  return response.cookies
    .filter((cookie) => cookie.value)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}
async function operation(
  document: Parameters<typeof print>[0],
  variables = {},
  cookie = '',
  authorization?: string,
) {
  return app.inject({
    method: 'POST',
    url: '/graphql',
    headers: { cookie, ...(authorization ? { authorization } : {}) },
    payload: { query: print(document), variables },
  });
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'taskmoto-test-'));
  const socket = join(directory, 'redis.sock');
  redisProcess = spawn(
    'redis-server',
    ['--port', '0', '--unixsocket', socket, '--save', '', '--appendonly', 'no'],
    { stdio: 'ignore' },
  );
  store = new Redis({
    path: socket,
    retryStrategy: (times) => (times < 30 ? 25 : null),
  });
  store.on('error', () => {});
  await new Promise<void>((resolve, reject) => {
    store.once('ready', resolve);
    store.once('end', () => reject(new Error('Test Redis did not start')));
  });
  const keys = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  config = {
    signingKey: keys.privateKey,
    publicKey: keys.publicKey,
    tls: undefined,
    secureCookies: true,
    webOrigin: 'https://localhost:3000',
    redisUrl: '',
    port: 0,
    host: '127.0.0.1',
  };
  app = await createApp(store, config, false);
});
after(async () => {
  await app?.close();
  await store?.quit();
  if (redisProcess && redisProcess.exitCode === null) {
    await new Promise<void>((resolve) => {
      redisProcess.once('exit', () => resolve());
      redisProcess.kill('SIGTERM');
    });
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});
test('readiness fails when Redis is unavailable or exceeds its deadline', async (t) => {
  assert.equal((await app.inject('/health')).statusCode, 200);
  const ping = t.mock.method(store, 'ping', () =>
    Promise.reject(new Error('private connection details')),
  );
  const failed = await app.inject('/health');
  assert.equal(failed.statusCode, 503);
  assert.deepEqual(failed.json(), { ok: false });
  assert.equal(failed.headers['cache-control'], 'no-store');
  ping.mock.mockImplementation(() => new Promise<never>(() => {}));
  const started = Date.now();
  assert.equal((await app.inject('/health')).statusCode, 503);
  assert.ok(Date.now() - started < 2500);
});
test('anonymous clients cannot create or read private entries', async () => {
  assert.equal(
    (await operation(ReportTime, { minutes: 10, name: 'private' })).json().data
      .reportTime.__typename,
    'AuthError',
  );
  const response = (await operation(Entries)).json();
  assert.equal(response.data.allTimeEntries, null);
  assert.equal(response.errors[0].extensions.code, 'UNAUTHENTICATED');
});
test('signup accepts six-character passwords and rejects shorter passwords', async () => {
  const username = 'six-character-user';
  const rejected = await operation(Signup, { username, password: 'abcde' });
  assert.equal(rejected.json().data.signup.__typename, 'SignupError');
  assert.match(rejected.json().data.signup.message, /at least 6 characters/);
  const accepted = await operation(Signup, { username, password: 'abcdef' });
  assert.equal(accepted.json().data.signup.__typename, 'AuthPayload');
  assert.equal(
    (await operation(Login, { username, password: 'abcdef' })).json().data.login
      .__typename,
    'AuthPayload',
  );
});
test('signup, login, logging, persistence, deletion, and account isolation', async () => {
  const signup = await operation(Signup, credentials);
  assert.equal(signup.json().data.signup.__typename, 'AuthPayload');
  for (const cookie of signup.cookies.filter((cookie) => cookie.value)) {
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.sameSite, 'Strict');
    assert.equal(cookie.path, '/');
  }
  let cookie = cookieHeader(signup);
  assert.equal(
    (await operation(Me, {}, cookie)).json().data.me.username,
    credentials.username,
  );
  const entry = (
    await operation(
      ReportTime,
      { minutes: 25, name: 'Migration verification' },
      cookie,
    )
  ).json().data.reportTime;
  assert.equal(entry.__typename, 'TimeEntry');
  assert.equal(entry.minutes, 25);
  await app.close();
  app = await createApp(store, config, false);
  assert.equal(
    (await operation(Entries, {}, cookie)).json().data.allTimeEntries
      .logEntries[0].id,
    entry.id,
  );
  const other = await operation(Signup, {
    username: 'another-user',
    password: credentials.password,
  });
  const otherCookie = cookieHeader(other);
  assert.deepEqual(
    (await operation(Entries, {}, otherCookie)).json().data.allTimeEntries
      .logEntries,
    [],
  );
  assert.equal(
    (await operation(DeleteTime, { id: entry.id }, otherCookie)).json().data
      .deleteTime.__typename,
    'DeleteTimeError',
  );
  assert.equal(
    (await operation(Entries, {}, cookie)).json().data.allTimeEntries.logEntries
      .length,
    1,
  );
  const access = signup.cookies.find(
    (value) => value.name === 'accessToken' && value.value,
  )!.value;
  assert.equal(
    (await operation(Me, {}, '', `Bearer ${access}`)).json().data.me.__typename,
    'User',
  );
  await operation(Logout, {}, cookie);
  assert.equal(
    (await operation(Me, {}, cookie)).json().data.me.__typename,
    'AuthError',
  );
  assert.equal(
    (await operation(Me, {}, '', `Bearer ${access}`)).json().data.me.__typename,
    'AuthError',
  );
  const login = await operation(Login, credentials);
  assert.equal(login.json().data.login.__typename, 'AuthPayload');
  cookie = cookieHeader(login);
  assert.equal(
    (await operation(DeleteTime, { id: entry.id }, cookie)).json().data
      .deleteTime.__typename,
    'TimeEntry',
  );
  assert.deepEqual(
    (await operation(Entries, {}, cookie)).json().data.allTimeEntries
      .logEntries,
    [],
  );
});
test('expired access refreshes once; replay and logged-out refresh sessions fail', async () => {
  const login = await operation(Login, credentials);
  const refresh = login.cookies.find(
    (cookie) => cookie.name === 'refreshToken' && cookie.value,
  )!.value;
  const claims = jwt.decode(refresh) as jwt.JwtPayload;
  assert.ok(Number.isFinite(claims.iat));
  assert.ok(Math.abs(claims.iat! - Date.now() / 1000) < 5);
  const expired = jwt.sign(
    { sub: claims.sub, jti: claims.jti, iat: claims.iat! - 600 },
    config.signingKey,
    { algorithm: 'RS256', expiresIn: 300 },
  );
  const refreshed = await operation(
    Me,
    {},
    `accessToken=${expired}; refreshToken=${refresh}`,
  );
  assert.equal(refreshed.json().data.me.__typename, 'User');
  const rotated = refreshed.cookies.find(
    (cookie) => cookie.name === 'refreshToken' && cookie.value,
  )!.value;
  assert.notEqual(rotated, refresh);
  assert.equal(
    (await operation(Me, {}, `refreshToken=${refresh}`)).json().data.me
      .__typename,
    'AuthError',
  );
  const active = cookieHeader(refreshed);
  await operation(Logout, {}, active);
  assert.equal(
    (await operation(Me, {}, `refreshToken=${rotated}`)).json().data.me
      .__typename,
    'AuthError',
  );
});
test('rejects invalid credentials, duplicate names, invalid minutes and hostile origins', async () => {
  assert.equal(
    (
      await operation(Login, { ...credentials, password: 'incorrect-password' })
    ).json().data.login.__typename,
    'LoginError',
  );
  assert.equal(
    (await operation(Signup, credentials)).json().data.signup.message,
    'Username is already taken',
  );
  const cookie = cookieHeader(await operation(Login, credentials));
  for (const minutes of [0, -1, 1.5, '10']) {
    const result = (await operation(ReportTime, { minutes }, cookie)).json();
    assert.ok(result.errors?.length);
  }
  const forbidden = await app.inject({
    method: 'POST',
    url: '/graphql',
    headers: { origin: 'https://evil.example' },
    payload: { query: print(Signup), variables: credentials },
  });
  assert.equal(forbidden.statusCode, 403);
});

async function passkeys(
  path: string,
  payload = {},
  cookie = '',
  origin = config.webOrigin,
) {
  return app.inject({
    method: 'POST',
    url: `/passkeys/${path}`,
    headers: { origin, cookie },
    payload,
  });
}
test('passkey signup and login use verified credentials and normal revocable sessions', async () => {
  const key = passkeyFixture();
  const options = await passkeys('registration/options', {
    username: 'passkey-user',
  });
  assert.equal(options.statusCode, 200);
  assert.equal(options.json().authenticatorSelection.residentKey, 'required');
  assert.equal(
    options.json().authenticatorSelection.userVerification,
    'required',
  );
  const challengeCookie = cookieHeader(options);
  const registration = key.register(options.json(), config.webOrigin);
  assert.equal(
    (await passkeys('registration/verify', registration)).statusCode,
    400,
  );
  const created = await passkeys(
    'registration/verify',
    registration,
    challengeCookie,
  );
  assert.equal(created.statusCode, 200);
  let session = cookieHeader(created);
  const user = (await operation(Me, {}, session)).json().data.me;
  assert.equal(user.username, 'passkey-user');
  assert.equal(await store.exists(`USER:${user.id}:HASH`), 0);
  assert.equal(
    (
      await operation(Login, { username: 'passkey-user', password: 'abcdef' })
    ).json().data.login.__typename,
    'LoginError',
  );
  assert.equal(
    (await passkeys('registration/verify', registration, challengeCookie))
      .statusCode,
    400,
  );
  const entry = (
    await operation(ReportTime, { minutes: 5, name: 'passkey work' }, session)
  ).json().data.reportTime;
  assert.equal(entry.__typename, 'TimeEntry');
  await operation(Logout, {}, session);
  assert.equal(
    (await operation(Me, {}, session)).json().data.me.__typename,
    'AuthError',
  );
  await app.close();
  app = await createApp(store, config, false);
  const loginOptions = await passkeys('authentication/options');
  const assertion = key.authenticate(loginOptions.json(), config.webOrigin);
  const loggedIn = await passkeys(
    'authentication/verify',
    assertion,
    cookieHeader(loginOptions),
  );
  assert.equal(loggedIn.statusCode, 200);
  session = cookieHeader(loggedIn);
  assert.equal((await operation(Me, {}, session)).json().data.me.id, user.id);
  assert.equal(
    (await operation(Entries, {}, session)).json().data.allTimeEntries
      .logEntries[0].id,
    entry.id,
  );
  assert.equal(
    (
      await passkeys(
        'authentication/verify',
        assertion,
        cookieHeader(loginOptions),
      )
    ).statusCode,
    400,
  );
  const refreshed = await operation(
    Me,
    {},
    `refreshToken=${loggedIn.cookies.find((c) => c.name === 'refreshToken' && c.value)!.value}`,
  );
  assert.equal(refreshed.json().data.me.id, user.id);
  await operation(Logout, {}, cookieHeader(refreshed));
  assert.equal(
    (await operation(Me, {}, cookieHeader(refreshed))).json().data.me
      .__typename,
    'AuthError',
  );
});

test('passkey verification rejects wrong origins, challenges, signatures and user verification', async () => {
  const key = passkeyFixture();
  assert.equal(
    (
      await passkeys(
        'registration/options',
        { username: 'denied-user' },
        '',
        'https://evil.example',
      )
    ).statusCode,
    403,
  );
  for (const mode of ['origin', 'challenge', 'verification', 'rpID']) {
    const options = await passkeys('registration/options', {
      username: 'bad-passkey-user',
    });
    const data = options.json();
    if (mode === 'challenge') data.challenge = randomUUID();
    if (mode === 'rpID') data.rp.id = 'evil.example';
    const response = key.register(
      data,
      mode === 'origin' ? 'https://evil.example' : config.webOrigin,
      mode === 'verification' ? 0x41 : 0x45,
    );
    assert.equal(
      (await passkeys('registration/verify', response, cookieHeader(options)))
        .statusCode,
      400,
      mode,
    );
  }
  assert.equal(
    await store.exists(
      `NAME:ID:${Buffer.from('bad-passkey-user').toString('base64')}`,
    ),
    0,
  );
  const options = await passkeys('registration/options', {
    username: 'signature-user',
  });
  assert.equal(
    (
      await passkeys(
        'registration/verify',
        key.register(options.json(), config.webOrigin),
        cookieHeader(options),
      )
    ).statusCode,
    200,
  );
  for (const mode of [
    'origin',
    'challenge',
    'signature',
    'verification',
    'userHandle',
    'unknown',
  ]) {
    const options = await passkeys('authentication/options');
    const data = options.json();
    if (mode === 'challenge') data.challenge = randomUUID();
    const response = key.authenticate(
      data,
      mode === 'origin' ? 'https://evil.example' : config.webOrigin,
      mode === 'verification' ? 0x01 : 0x05,
    );
    if (mode === 'signature')
      response.response.signature = Buffer.alloc(64).toString('base64url');
    if (mode === 'userHandle')
      response.response.userHandle =
        Buffer.from('another-user').toString('base64url');
    if (mode === 'unknown') response.id = 'unknown';
    assert.equal(
      (await passkeys('authentication/verify', response, cookieHeader(options)))
        .statusCode,
      400,
      mode,
    );
  }
});

test('existing accounts can add passkeys only with their authenticated session', async () => {
  assert.equal(
    (await passkeys('registration/options', { enroll: true })).statusCode,
    401,
  );
  assert.equal(
    (await passkeys('registration/options', { username: credentials.username }))
      .statusCode,
    400,
  );
  const login = await operation(Login, credentials);
  const session = cookieHeader(login);
  const options = await passkeys(
    'registration/options',
    { enroll: true, username: 'ignored-name' },
    session,
  );
  assert.equal(options.json().user.name, credentials.username);
  const key = passkeyFixture();
  const response = key.register(options.json(), config.webOrigin);
  const added = await passkeys(
    'registration/verify',
    response,
    `${session}; ${cookieHeader(options)}`,
  );
  assert.equal(added.statusCode, 200);
  const user = (await operation(Me, {}, cookieHeader(added))).json().data.me;
  assert.equal(user.username, credentials.username);
  const auth = await passkeys('authentication/options');
  const authenticated = await passkeys(
    'authentication/verify',
    key.authenticate(auth.json(), config.webOrigin),
    cookieHeader(auth),
  );
  assert.equal(authenticated.statusCode, 200);
  assert.equal(
    (await operation(Me, {}, cookieHeader(authenticated))).json().data.me.id,
    user.id,
  );
  assert.equal(
    (await operation(Login, credentials)).json().data.login.__typename,
    'AuthPayload',
  );
  const fresh = await passkeys(
    'registration/options',
    { enroll: true },
    cookieHeader(added),
  );
  await operation(Logout, {}, cookieHeader(added));
  const unattached = passkeyFixture().register(fresh.json(), config.webOrigin);
  assert.equal(
    (
      await passkeys(
        'registration/verify',
        unattached,
        `${cookieHeader(added)}; ${cookieHeader(fresh)}`,
      )
    ).statusCode,
    400,
  );
});

test('expired challenges, mixed ceremonies and signup races cannot create accounts', async () => {
  const expired = await passkeys('registration/options', {
    username: 'expired-passkey-user',
  });
  const challenge = expired.cookies.find(
    (c) => c.name === 'passkeyChallenge',
  )!.value;
  assert.ok((await store.ttl(`PASSKEY_CHALLENGE:${challenge}`)) <= 300);
  await store.del(`PASSKEY_CHALLENGE:${challenge}`);
  assert.equal(
    (
      await passkeys(
        'registration/verify',
        passkeyFixture().register(expired.json(), config.webOrigin),
        cookieHeader(expired),
      )
    ).statusCode,
    400,
  );
  assert.equal(
    await store.exists(
      `NAME:ID:${Buffer.from('expired-passkey-user').toString('base64')}`,
    ),
    0,
  );
  const mixed = await passkeys('authentication/options');
  assert.equal(
    (await passkeys('registration/verify', {}, cookieHeader(mixed))).statusCode,
    400,
  );
  assert.equal(
    (await passkeys('authentication/verify', {}, cookieHeader(mixed)))
      .statusCode,
    400,
  );
  const options = await passkeys('registration/options', {
    username: 'race-passkey-user',
  });
  const original = await operation(Signup, {
    username: 'race-passkey-user',
    password: 'abcdef',
  });
  const originalUser = original.json().data.signup.user;
  const key = passkeyFixture();
  const raced = await passkeys(
    'registration/verify',
    key.register(options.json(), config.webOrigin),
    cookieHeader(options),
  );
  assert.equal(raced.statusCode, 400);
  assert.equal(raced.json().error, 'Username is already taken');
  assert.equal(await store.exists(`PASSKEY:${key.id}`), 0);
  assert.equal(
    (await operation(Me, {}, cookieHeader(original))).json().data.me.id,
    originalUser.id,
  );
});

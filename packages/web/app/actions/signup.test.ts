import { test } from 'node:test';
import assert from 'node:assert/strict';
import { router } from '../router.ts';

const origin = 'https://localhost:3000';
test('public readiness checks API readiness and hides failures', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async (url: URL, init: RequestInit) => {
      assert.equal(url.pathname, '/health');
      assert.ok(init.signal);
      return Response.json({ ok: true });
    },
  );
  assert.equal(
    (await router.fetch(new Request(`${origin}/health`))).status,
    200,
  );
  fetch.mock.mockImplementation(async () =>
    Response.json({ ok: false }, { status: 503 }),
  );
  assert.equal(
    (await router.fetch(new Request(`${origin}/health`))).status,
    503,
  );
  fetch.mock.mockImplementation(async () => {
    throw new Error('private upstream address');
  });
  const response = await router.fetch(new Request(`${origin}/health`));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
function register(password: string, confirmation?: string) {
  const body = new URLSearchParams({ username: 'confirmation-user', password });
  if (confirmation !== undefined) body.set('confirmPassword', confirmation);
  return router.fetch(
    new Request(`${origin}/signup`, {
      method: 'POST',
      headers: { origin },
      body,
    }),
  );
}

test('missing or mismatched password confirmation never reaches account creation', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Account creation must not be called');
  });
  for (const confirmation of [undefined, '', 'different-password']) {
    const response = await register('secret-six', confirmation);
    assert.equal(response.status, 400);
    const html = await response.text();
    assert.match(html, /Passwords must match/);
    assert.match(html, /confirmation-user/);
    assert.ok(!html.includes('secret-six'));
    assert.ok(!html.includes('different-password'));
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('matching confirmation submits only the account credentials to the API', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      assert.deepEqual(payload.variables, {
        username: 'confirmation-user',
        password: 'abcdef',
      });
      return Response.json({
        data: {
          signup: {
            __typename: 'AuthPayload',
            user: { id: 'test-user', username: 'confirmation-user' },
          },
        },
      });
    },
  );
  const response = await register('abcdef', 'abcdef');
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/');
  assert.equal(fetch.mock.callCount(), 1);
});

test('passkey proxy preserves challenge/session cookies and API validation errors', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async (url: URL, init: RequestInit) => {
      assert.equal(url.pathname, '/passkeys/registration/options');
      assert.equal(new Headers(init.headers).get('origin'), origin);
      assert.equal(
        new Headers(init.headers).get('cookie'),
        'passkeyChallenge=test-challenge',
      );
      assert.deepEqual(JSON.parse(String(init.body)), {
        username: 'passkey-user',
      });
      const headers = new Headers({ 'content-type': 'application/json' });
      headers.append(
        'set-cookie',
        'passkeyChallenge=next-challenge; HttpOnly; Secure; SameSite=Strict; Path=/',
      );
      return Response.json(
        { error: 'Username is already taken' },
        { status: 400, headers },
      );
    },
  );
  const response = await router.fetch(
    new Request(`${origin}/passkeys/registration/options`, {
      method: 'POST',
      headers: {
        origin,
        'content-type': 'application/json',
        cookie: 'passkeyChallenge=test-challenge',
      },
      body: JSON.stringify({ username: 'passkey-user' }),
    }),
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'Username is already taken');
  assert.match(
    response.headers.get('set-cookie')!,
    /passkeyChallenge=next-challenge/,
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(fetch.mock.callCount(), 1);
});

test('passkey proxy rejects foreign origins and unknown ceremonies before forwarding', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Must not forward');
  });
  for (const [path, requestOrigin, status] of [
    ['/passkeys/registration/options', 'https://evil.example', 403],
    ['/passkeys/anything/options', origin, 404],
    ['/passkeys/authentication/anything', origin, 404],
  ] as const) {
    const response = await router.fetch(
      new Request(`${origin}${path}`, {
        method: 'POST',
        headers: { origin: requestOrigin, 'content-type': 'application/json' },
        body: '{}',
      }),
    );
    assert.equal(response.status, status);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

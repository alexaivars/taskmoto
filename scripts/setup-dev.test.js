const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taskmoto-setup-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of ['scripts', 'packages/api', 'packages/web'])
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  for (const file of ['setup-dev.js', 'domains.ext'])
    fs.copyFileSync(
      path.join(__dirname, file),
      path.join(root, 'scripts', file),
    );
  fs.symlinkSync(
    path.resolve(__dirname, '../node_modules'),
    path.join(root, 'node_modules'),
  );
  const cert = (file) => path.join(root, 'scripts/certs', file);
  const run = () =>
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts/setup-dev.js'), '--no-trust'],
      { encoding: 'utf8' },
    );
  const openssl = (...args) =>
    execFileSync('openssl', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  return { root, cert, run, openssl };
}

test('setup creates valid HTTPS and preserves keys and unrelated settings on repeat runs', (t) => {
  const { root, cert, run, openssl } = fixture(t);
  const apiEnv = path.join(root, 'packages/api/.env');
  const webEnv = path.join(root, 'packages/web/.env');
  fs.writeFileSync(apiEnv, 'API_PORT=9443\nREDIS_URL=redis://127.0.0.1:6380\n');
  fs.writeFileSync(webEnv, 'WEB_PORT=3443\n');
  run();
  for (const host of [
    'localhost',
    'timecard.test',
    'www.timecard.test',
    'api.timecard.test',
  ])
    openssl(
      'verify',
      '-x509_strict',
      '-purpose',
      'sslserver',
      '-verify_hostname',
      host,
      '-CAfile',
      cert('RootCA.pem'),
      cert('localhost.crt'),
    );
  for (const ip of ['127.0.0.1', '::1'])
    openssl(
      'verify',
      '-verify_ip',
      ip,
      '-CAfile',
      cert('RootCA.pem'),
      cert('localhost.crt'),
    );
  const files = [
    'RootCA.pem',
    'RootCA.key',
    'localhost.key',
    'localhost.crt',
    'jwtAccessTokenSecret.pem',
    'jwtAccessTokenPublic.pem',
  ];
  const before = files.map((file) => fs.readFileSync(cert(file)));
  const environments = [
    fs.readFileSync(apiEnv, 'utf8'),
    fs.readFileSync(webEnv, 'utf8'),
  ];
  run();
  files.forEach((file, i) =>
    assert.deepEqual(fs.readFileSync(cert(file)), before[i]),
  );
  assert.equal(fs.readFileSync(apiEnv, 'utf8'), environments[0]);
  assert.equal(fs.readFileSync(webEnv, 'utf8'), environments[1]);
  assert.match(environments[0], /REDIS_URL=redis:\/\/127.0.0.1:6380/);
  assert.match(environments[0], /WEB_ORIGIN="https:\/\/localhost:3443"/);
  assert.match(environments[1], /API_URL="https:\/\/localhost:9443\/graphql"/);
});

test('setup repairs a legacy CA without rotating private keys', (t) => {
  const { cert, run, openssl } = fixture(t);
  run();
  const files = ['RootCA.key', 'localhost.key', 'jwtAccessTokenSecret.pem'];
  const keys = files.map((file) => fs.readFileSync(cert(file)));
  openssl(
    'x509',
    '-in',
    cert('RootCA.pem'),
    '-clrext',
    '-signkey',
    cert('RootCA.key'),
    '-days',
    '3650',
    '-out',
    cert('legacy.pem'),
  );
  fs.renameSync(cert('legacy.pem'), cert('RootCA.pem'));
  const legacy = fs.readFileSync(cert('RootCA.pem'));
  assert.match(run(), /repaired/);
  assert.deepEqual(fs.readFileSync(cert('RootCA.previous.pem')), legacy);
  files.forEach((file, i) =>
    assert.deepEqual(fs.readFileSync(cert(file)), keys[i]),
  );
  openssl(
    'verify',
    '-x509_strict',
    '-purpose',
    'sslserver',
    '-verify_hostname',
    'localhost',
    '-CAfile',
    cert('RootCA.pem'),
    cert('localhost.crt'),
  );
});

test('setup renews a certificate nearing expiry with its existing key', (t) => {
  const { root, cert, run, openssl } = fixture(t);
  run();
  const key = fs.readFileSync(cert('localhost.key'));
  openssl(
    'req',
    '-new',
    '-key',
    cert('localhost.key'),
    '-subj',
    '/CN=localhost',
    '-out',
    cert('short.csr'),
  );
  openssl(
    'x509',
    '-req',
    '-in',
    cert('short.csr'),
    '-CA',
    cert('RootCA.pem'),
    '-CAkey',
    cert('RootCA.key'),
    '-CAcreateserial',
    '-days',
    '1',
    '-extfile',
    path.join(root, 'scripts/domains.ext'),
    '-out',
    cert('localhost.crt'),
  );
  assert.match(run(), /renewed localhost/);
  assert.deepEqual(fs.readFileSync(cert('localhost.key')), key);
  openssl(
    'x509',
    '-in',
    cert('localhost.crt'),
    '-checkend',
    String(30 * 86400),
    '-noout',
  );
});

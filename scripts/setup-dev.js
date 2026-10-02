const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const { randomBytes } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const certs = path.join(__dirname, 'certs');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(
    'Usage: yarn setup [--trust | --no-trust]\n\nGenerate or reuse local HTTPS certificates and JWT keys, and configure the API/web .env files.\nOn macOS, setup trusts the local CA in your login keychain by default.\n--no-trust skips trust installation (for CI or manual configuration).',
  );
  process.exit(0);
}
if (
  args.some((arg) => !['--trust', '--no-trust'].includes(arg)) ||
  (args.includes('--trust') && args.includes('--no-trust'))
)
  throw new Error('Unknown option. Use yarn setup --help.');
if (args.includes('--trust') && process.platform !== 'darwin')
  throw new Error(
    '--trust supports macOS only. Import scripts/certs/RootCA.crt into your local trust store manually.',
  );

const installTrust =
  process.platform === 'darwin' && !args.includes('--no-trust');

function openssl(args, allowFailure = false) {
  const result = spawnSync('openssl', args, { encoding: 'utf8' });
  if (result.error)
    throw new Error(`OpenSSL is required: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure)
    throw new Error(`OpenSSL ${args[0]} failed: ${result.stderr.trim()}`);
  return result;
}
function assertPair(key, certificate) {
  const publicKey = openssl(['pkey', '-in', key, '-pubout']).stdout.trim();
  const certificateKey = openssl([
    'x509',
    '-in',
    certificate,
    '-pubkey',
    '-noout',
  ]).stdout.trim();
  if (publicKey !== certificateKey)
    throw new Error(
      `The key and certificate do not match: ${path.basename(certificate)}. Existing files were preserved.`,
    );
}
function pairedFiles(key, certificate) {
  if (fs.existsSync(key) !== fs.existsSync(certificate))
    throw new Error(
      `Incomplete certificate pair: ${path.basename(key)} and ${path.basename(certificate)}. Restore the missing file before rerunning setup.`,
    );
  return fs.existsSync(key);
}

fs.mkdirSync(certs, { recursive: true, mode: 0o700 });
const temporary = fs.mkdtempSync(path.join(certs, '.setup-'));
const caKey = path.join(certs, 'RootCA.key');
const ca = path.join(certs, 'RootCA.pem');
const tlsKey = path.join(certs, 'localhost.key');
const tlsCertificate = path.join(certs, 'localhost.crt');
const jwtPrivate = path.join(certs, 'jwtAccessTokenSecret.pem');
const jwtPublic = path.join(certs, 'jwtAccessTokenPublic.pem');
process.umask(0o077);
try {
  const caExtensions = path.join(temporary, 'ca.ext');
  fs.writeFileSync(
    caExtensions,
    'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid:always\n',
  );
  if (!pairedFiles(caKey, ca)) {
    const config = path.join(temporary, 'ca.cnf');
    fs.writeFileSync(
      config,
      '[req]\nprompt=no\ndistinguished_name=subject\nx509_extensions=ca\n[subject]\nCN=Taskmoto Local Development CA\nO=Taskmoto Development\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\n',
    );
    const key = path.join(temporary, 'RootCA.key');
    const certificate = path.join(temporary, 'RootCA.pem');
    openssl([
      'req',
      '-x509',
      '-nodes',
      '-newkey',
      'rsa:3072',
      '-sha256',
      '-days',
      '3650',
      '-config',
      config,
      '-keyout',
      key,
      '-out',
      certificate,
    ]);
    fs.renameSync(key, caKey);
    fs.renameSync(certificate, ca);
    console.log('Created local development CA.');
  } else {
    assertPair(caKey, ca);
    const description = openssl(['x509', '-in', ca, '-text', '-noout']).stdout;
    if (
      !description.includes('CA:TRUE') ||
      !description.includes('Certificate Sign') ||
      openssl(['x509', '-in', ca, '-checkend', '86400', '-noout'], true)
        .status !== 0
    ) {
      // Reissue expired or legacy CA certificates with proper CA extensions,
      // preserving the subject and private key, including JWT signing keys.
      const renewed = path.join(temporary, 'RootCA-renewed.pem');
      openssl([
        'x509',
        '-in',
        ca,
        '-signkey',
        caKey,
        '-sha256',
        '-days',
        '3650',
        '-set_serial',
        `0x${randomBytes(16).toString('hex')}`,
        '-extfile',
        caExtensions,
        '-out',
        renewed,
      ]);
      assertPair(caKey, renewed);
      openssl([
        'verify',
        '-x509_strict',
        '-check_ss_sig',
        '-CAfile',
        renewed,
        renewed,
      ]);
      fs.copyFileSync(ca, path.join(certs, 'RootCA.previous.pem'));
      fs.renameSync(renewed, ca);
      console.log(
        'Renewed or repaired the development CA certificate using its existing key. Previous certificate saved as RootCA.previous.pem.',
      );
    } else console.log('Reusing existing development CA.');
  }
  openssl([
    'x509',
    '-in',
    ca,
    '-outform',
    'pem',
    '-out',
    path.join(certs, 'RootCA.crt'),
  ]);
  let renew = !pairedFiles(tlsKey, tlsCertificate);
  if (!renew) {
    assertPair(tlsKey, tlsCertificate);
    const valid =
      openssl(
        [
          'verify',
          '-x509_strict',
          '-purpose',
          'sslserver',
          '-verify_hostname',
          'localhost',
          '-CAfile',
          ca,
          tlsCertificate,
        ],
        true,
      ).status === 0;
    const fresh =
      openssl(
        [
          'x509',
          '-in',
          tlsCertificate,
          '-checkend',
          String(30 * 86400),
          '-noout',
        ],
        true,
      ).status === 0;
    const description = openssl([
      'x509',
      '-in',
      tlsCertificate,
      '-text',
      '-noout',
    ]).stdout;
    renew =
      !valid ||
      !fresh ||
      !description.includes('DNS:localhost') ||
      !description.includes('IP Address:127.0.0.1');
  }
  if (renew) {
    const key = fs.existsSync(tlsKey)
      ? tlsKey
      : path.join(temporary, 'localhost.key');
    if (!fs.existsSync(key)) openssl(['genrsa', '-out', key, '3072']);
    const request = path.join(temporary, 'localhost.csr');
    const certificate = path.join(temporary, 'localhost.crt');
    openssl([
      'req',
      '-new',
      '-key',
      key,
      '-out',
      request,
      '-subj',
      '/CN=localhost/O=Taskmoto Development',
    ]);
    openssl([
      'x509',
      '-req',
      '-sha256',
      '-days',
      '365',
      '-in',
      request,
      '-CA',
      ca,
      '-CAkey',
      caKey,
      '-CAcreateserial',
      '-extfile',
      path.join(__dirname, 'domains.ext'),
      '-out',
      certificate,
    ]);
    assertPair(key, certificate);
    openssl([
      'verify',
      '-x509_strict',
      '-purpose',
      'sslserver',
      '-verify_hostname',
      'localhost',
      '-CAfile',
      ca,
      certificate,
    ]);
    if (key !== tlsKey) fs.renameSync(key, tlsKey);
    fs.renameSync(certificate, tlsCertificate);
    console.log('Created or renewed localhost certificate.');
  } else console.log('Reusing existing localhost certificate.');

  if (!fs.existsSync(jwtPrivate)) {
    if (fs.existsSync(jwtPublic))
      throw new Error(
        'JWT public key exists but the private key is missing. Restore the private key; setup will not silently replace account signing keys.',
      );
    const key = path.join(temporary, 'jwt-private.pem');
    openssl(['genrsa', '-out', key, '3072']);
    fs.renameSync(key, jwtPrivate);
    console.log('Created JWT signing key.');
  } else console.log('Reusing existing JWT signing key.');
  const publicKey = openssl(['pkey', '-in', jwtPrivate, '-pubout']).stdout;
  if (
    fs.existsSync(jwtPublic) &&
    fs.readFileSync(jwtPublic, 'utf8').trim() !== publicKey.trim()
  )
    throw new Error(
      'JWT public and private keys do not match. Existing keys were preserved.',
    );
  if (!fs.existsSync(jwtPublic)) fs.writeFileSync(jwtPublic, publicKey);
  for (const file of [caKey, tlsKey, jwtPrivate]) fs.chmodSync(file, 0o600);

  const apiEnv = path.join(root, 'packages/api/.env');
  const webEnv = path.join(root, 'packages/web/.env');
  const read = (file) =>
    fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const apiSettings = dotenv.parse(read(apiEnv));
  const webSettings = dotenv.parse(read(webEnv));
  function port(value, fallback) {
    const parsed = value === undefined ? fallback : Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535)
      throw new Error('API_PORT and WEB_PORT must be valid port numbers.');
    return parsed;
  }
  const apiPort = port(apiSettings.API_PORT, 8443);
  const webPort = port(webSettings.WEB_PORT, 3000);
  const origin = `https://localhost:${webPort}`;
  const managed = [
    'SSL_PRIVATE_KEY',
    'SSL_CERTIFICATE',
    'SSL_PRIVATE_KEY_FILE',
    'SSL_CERTIFICATE_FILE',
    'JWT_ACCESS_TOKEN_SECRET',
    'JWT_ACCESS_TOKEN_PUBLIC',
    'JWT_ACCESS_TOKEN_SECRET_FILE',
    'JWT_ACCESS_TOKEN_PUBLIC_FILE',
    'NODE_EXTRA_CA_CERTS',
    'WEB_ORIGIN',
    'API_URL',
  ];
  // Remove complete managed assignments, including the old multiline PEM values.
  const assignment = new RegExp(
    `^[ \\t]*(?:export[ \\t]+)?(?:${managed.join('|')})[ \\t]*=[ \\t]*(?:"(?:\\\\.|[^"\\\\])*"|'[^']*'|[^\\r\\n]*)[ \\t]*(?:#[^\\r\\n]*)?\\r?$`,
    'gm',
  );
  const common = {
    SSL_PRIVATE_KEY_FILE: tlsKey,
    SSL_CERTIFICATE_FILE: tlsCertificate,
    NODE_EXTRA_CA_CERTS: ca,
    WEB_ORIGIN: origin,
  };
  function updateEnv(file, values) {
    const existing = read(file)
      .replace(assignment, '')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd();
    const content =
      (existing ? `${existing}\n\n` : '') +
      Object.entries(values)
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
        .join('\n') +
      '\n';
    const temporaryEnv = path.join(
      path.dirname(file),
      `.env.setup-${process.pid}`,
    );
    try {
      fs.writeFileSync(temporaryEnv, content, { mode: 0o600, flag: 'wx' });
      fs.renameSync(temporaryEnv, file);
    } finally {
      if (fs.existsSync(temporaryEnv)) fs.unlinkSync(temporaryEnv);
    }
  }
  updateEnv(apiEnv, {
    ...common,
    JWT_ACCESS_TOKEN_SECRET_FILE: jwtPrivate,
    JWT_ACCESS_TOKEN_PUBLIC_FILE: jwtPublic,
  });
  updateEnv(webEnv, {
    ...common,
    API_URL: `https://localhost:${apiPort}/graphql`,
  });
  console.log(
    'Configured API and web .env files; unrelated settings were retained.',
  );
  if (installTrust) {
    const result = spawnSync(
      'security',
      [
        'add-trusted-cert',
        '-r',
        'trustRoot',
        '-p',
        'ssl',
        '-k',
        path.join(os.homedir(), 'Library/Keychains/login.keychain-db'),
        path.join(certs, 'RootCA.crt'),
      ],
      { stdio: 'inherit', timeout: 60000 },
    );
    if (result.error || result.status !== 0)
      throw new Error(
        'Certificates and environment are configured, but macOS could not trust the CA. Rerun yarn setup --trust after resolving the keychain permission.',
      );
    console.log('Trusted the development CA in your macOS login keychain.');
  } else
    console.log(
      process.platform === 'darwin'
        ? 'Trust installation skipped. Run yarn setup to trust browser HTTPS.'
        : 'Import scripts/certs/RootCA.crt into your operating system or browser trust store for trusted HTTPS.',
    );
  console.log(`Start Redis, then yarn dev. Open ${origin}`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

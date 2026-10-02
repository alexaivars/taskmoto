#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, mkdir, copyFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve4 } from 'node:dns/promises';
import { isIP } from 'node:net';

export function parseConfig(source) {
  const config = {};
  const allowed = new Set([
    'DEPLOY_DOMAIN',
    'DEPLOY_SSH_HOST',
    'DEPLOY_SSH_USER',
    'DEPLOY_SSH_PORT',
    'LINODE_INSTANCE_ID',
  ]);
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const match = /^([A-Z_]+)=([^\s#]+)$/.exec(line.trim());
    if (!match || !allowed.has(match[1]))
      throw new Error('Invalid or unknown .env.deploy assignment');
    if (config[match[1]]) throw new Error(`Duplicate ${match[1]}`);
    config[match[1]] = match[2];
  }
  for (const key of ['DEPLOY_DOMAIN', 'DEPLOY_SSH_HOST', 'DEPLOY_SSH_USER']) {
    if (!config[key]) throw new Error(`Missing ${key} in .env.deploy`);
  }
  if (
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
      config.DEPLOY_DOMAIN,
    )
  ) {
    throw new Error(
      'DEPLOY_DOMAIN must be a lowercase public hostname, without a scheme or path',
    );
  }
  if (isIP(config.DEPLOY_SSH_HOST) !== 4)
    throw new Error('DEPLOY_SSH_HOST must be the target public IPv4 address');
  if (!/^[a-z_][a-z0-9_-]*$/.test(config.DEPLOY_SSH_USER))
    throw new Error('Invalid SSH user');
  config.DEPLOY_SSH_PORT ??= '22';
  if (
    !/^\d+$/.test(config.DEPLOY_SSH_PORT) ||
    +config.DEPLOY_SSH_PORT < 1 ||
    +config.DEPLOY_SSH_PORT > 65535
  )
    throw new Error('Invalid SSH port');
  if (config.LINODE_INSTANCE_ID && !/^\d+$/.test(config.LINODE_INSTANCE_ID))
    throw new Error('Invalid Linode instance ID');
  return config;
}

export function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function run(
  command,
  args,
  { cwd, capture = false, timeout = 30 * 60_000, input } = {},
) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: [
        input ? 'pipe' : 'ignore',
        capture ? 'pipe' : 'inherit',
        'inherit',
      ],
    });
    let output = '';
    child.stdout?.on('data', (chunk) => {
      output += chunk;
    });
    const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
    const stop = () => child.kill('SIGTERM');
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    child.once('error', reject);
    if (input) {
      input.on('error', reject);
      child.stdin.on('error', (error) => {
        if (error.code !== 'EPIPE') reject(error);
      });
      input.pipe(child.stdin);
    }
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      if (code === 0) resolveResult(output.trim());
      else reject(new Error(`${command} failed (${signal ?? code})`));
    });
  });
}

export async function deploy(revision) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const config = parseConfig(await readFile(join(root, '.env.deploy'), 'utf8'));
  if (!revision || revision.startsWith('-'))
    throw new Error('Usage: yarn deploy <committed-revision>');
  const sha = await run(
    'git',
    ['rev-parse', '--verify', `${revision}^{commit}`],
    { cwd: root, capture: true },
  );
  if (!/^[a-f0-9]{40}$/.test(sha))
    throw new Error('Expected a full committed Git SHA');
  const addresses = await resolve4(config.DEPLOY_DOMAIN);
  if (!addresses.includes(config.DEPLOY_SSH_HOST))
    throw new Error('Public DNS does not point to the configured Linode');
  if (config.LINODE_INSTANCE_ID) {
    const instance = JSON.parse(
      await run(
        'linode-cli',
        ['linodes', 'view', config.LINODE_INSTANCE_ID, '--json'],
        { capture: true, timeout: 30_000 },
      ),
    )[0];
    if (
      !instance?.ipv4.includes(config.DEPLOY_SSH_HOST) ||
      instance.status !== 'running'
    )
      throw new Error('Linode identity/address/status mismatch');
  }
  const ssh = [
    '-o',
    'BatchMode=yes',
    '-o',
    'StrictHostKeyChecking=yes',
    '-o',
    'ConnectTimeout=10',
    '-o',
    'ServerAliveInterval=15',
    '-o',
    'ServerAliveCountMax=3',
    '-p',
    config.DEPLOY_SSH_PORT,
    `${config.DEPLOY_SSH_USER}@${config.DEPLOY_SSH_HOST}`,
  ];
  const hostArchitecture = await run('ssh', [...ssh, 'uname -m'], {
    capture: true,
    timeout: 20_000,
  });
  if (hostArchitecture !== 'x86_64')
    throw new Error('This deployment targets a Linux AMD64 server');
  const directory = await mkdtemp(join(tmpdir(), 'taskmoto-deploy-'));
  try {
    const source = join(directory, 'source');
    const bundle = join(directory, 'bundle');
    await mkdir(source);
    await mkdir(bundle);
    const archive = join(directory, 'source.tar');
    await run('git', ['archive', '--format=tar', '-o', archive, sha], {
      cwd: root,
    });
    await run('tar', ['-xf', archive, '-C', source]);
    const selectedScript = await readFile(
      join(source, 'scripts/deploy.mjs'),
      'utf8',
    );
    if (
      selectedScript !==
      (await readFile(fileURLToPath(import.meta.url), 'utf8'))
    )
      throw new Error(
        'Run the deploy command from the selected revision; deployment tooling differs',
      );
    console.log(
      `Deploying committed revision ${sha}; uncommitted files are excluded.`,
    );
    const build = [
      'buildx',
      'build',
      '--platform',
      'linux/amd64',
      '--load',
      '-f',
      'deploy/Dockerfile',
      '--build-arg',
      `REVISION=${sha}`,
    ];
    await run(
      'docker',
      [...build, '--target', 'verified', '-t', `taskmoto-verify:${sha}`, '.'],
      { cwd: source },
    );
    // Always run checks, even when Docker's build cache is reusable.
    await run(
      'docker',
      [
        'run',
        '--rm',
        '--platform',
        'linux/amd64',
        `taskmoto-verify:${sha}`,
        'sh',
        '-c',
        'yarn build && yarn test && yarn test:deploy',
      ],
      { timeout: 10 * 60_000 },
    );
    for (const service of ['api', 'web']) {
      await run(
        'docker',
        [
          ...build,
          '--target',
          service,
          '-t',
          `taskmoto-${service}:${sha}`,
          '.',
        ],
        { cwd: source },
      );
      const platform = await run(
        'docker',
        [
          'image',
          'inspect',
          `taskmoto-${service}:${sha}`,
          '--format',
          '{{.Os}}/{{.Architecture}}',
        ],
        { capture: true },
      );
      if (platform !== 'linux/amd64')
        throw new Error(`Wrong platform for ${service}`);
    }
    const images = join(bundle, 'images.tar');
    await run('docker', [
      'save',
      '-o',
      images,
      `taskmoto-api:${sha}`,
      `taskmoto-web:${sha}`,
    ]);
    await run('gzip', ['-1', images]);
    for (const file of ['compose.yml', 'Caddyfile'])
      await copyFile(join(source, 'deploy', file), join(bundle, file));
    const size = (await stat(`${images}.gz`)).size;
    const remote = await readFile(join(source, 'deploy/remote.sh'), 'utf8');
    const command = `flock -n -E 75 /run/lock/taskmoto-deploy.lock bash -c ${shellQuote(remote)} -- ${shellQuote(sha)} ${shellQuote(config.DEPLOY_DOMAIN)} ${size} || { result=$?; if [ "$result" -eq 75 ]; then echo 'Deployment already running; no changes applied.' >&2; fi; exit "$result"; }`;
    console.log(
      'Uploading images and applying the release under the server deployment lock.',
    );
    const transfer = spawn('tar', ['-cf', '-', '-C', bundle, '.'], {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: { ...process.env, COPYFILE_DISABLE: '1' },
    });
    const transferDone = new Promise((resolveTransfer, reject) => {
      transfer.once('error', reject);
      transfer.once('close', (code) =>
        code === 0
          ? resolveTransfer()
          : reject(new Error(`Archive transfer failed (${code})`)),
      );
    });
    try {
      await Promise.all([
        run('ssh', [...ssh, command], {
          input: transfer.stdout,
          timeout: 20 * 60_000,
        }),
        transferDone,
      ]);
    } finally {
      if (transfer.exitCode === null) transfer.kill();
    }
    const response = await fetch(`https://${config.DEPLOY_DOMAIN}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || (await response.json()).ok !== true)
      throw new Error('External HTTPS readiness failed');
    console.log(`Release ${sha} is healthy over public HTTPS.`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  deploy(process.argv[2]).catch((error) => {
    console.error(
      `Deployment failed: ${error.message}. Check logs and roll forward; no rollback was attempted.`,
    );
    process.exitCode = 1;
  });
}

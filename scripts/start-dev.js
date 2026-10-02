const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { concurrently } = require('concurrently');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', 'scripts/sync-schema.ts'],
  { cwd: root, stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);
function environment(name) {
  const file = path.join(root, 'packages', name, '.env');
  const configured = fs.existsSync(file)
    ? dotenv.parse(fs.readFileSync(file))
    : {};
  return { ...configured, ...process.env };
}
const { result: running } = concurrently(
  [
    {
      command: 'node --watch --import tsx scripts/sync-schema.ts',
      name: 'schema',
      cwd: root,
    },
    {
      command: 'yarn dev',
      name: 'api',
      cwd: path.join(root, 'packages/api'),
      env: environment('api'),
    },
    {
      command: 'yarn dev',
      name: 'web',
      cwd: path.join(root, 'packages/web'),
      env: environment('web'),
    },
  ],
  { prefix: 'name', killOthersOn: ['failure'], cwd: root },
);
running.catch(() => process.exit(1));

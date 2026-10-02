import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, shellQuote } from './deploy.mjs';

const source =
  'DEPLOY_DOMAIN=app.example.com\nDEPLOY_SSH_HOST=203.0.113.10\nDEPLOY_SSH_USER=root\n';
test('deployment config applies defaults without empty assignments', () => {
  const config = parseConfig(source);
  assert.equal(config.DEPLOY_SSH_PORT, '22');
  assert.equal(config.DEPLOY_DOMAIN, 'app.example.com');
});
test('rejects unsafe, ambiguous and missing connection settings before remote execution', () => {
  for (const extra of [
    'DEPLOY_DOMAIN=other.example.com',
    'DEPLOY_SSH_PORT=0',
    'DEPLOY_SSH_PORT=65536',
    'DEPLOY_ROOT=',
    'UNKNOWN=value',
    'LINODE_INSTANCE_ID=abc',
  ]) {
    assert.throws(() => parseConfig(source + extra));
  }
  for (const domain of [
    'https://app.example.com',
    'app.example.com/path',
    'app.example.com;id',
    '$(id)',
    '-bad.example.com',
  ]) {
    assert.throws(() => parseConfig(source.replace('app.example.com', domain)));
  }
  assert.throws(() =>
    parseConfig(source.replace('DEPLOY_SSH_USER=root\n', '')),
  );
});
test('SSH shell arguments escape single quotes instead of executing them', () => {
  assert.equal(shellQuote("a'b"), "'a'\\''b'");
});

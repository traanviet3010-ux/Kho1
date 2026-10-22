import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { cleanFilename, extensionOf, modeFor, MODES, signSession, verifySession } from '../lib.mjs';

test('allowlist blocks unknown modes and wrong extensions', () => {
  assert.equal(modeFor('magic', 'x.exe'), null);
  assert.equal(modeFor('il2cpp', 'x.exe'), null);
  assert.equal(modeFor('il2cpp', 'global-metadata.dat')?.command, 'inspect-il2cpp-metadata');
  assert.equal(modeFor('artifact', 'data.pk2')?.command, 'inspect-artifact');
  assert.equal(modeFor('artifact', 'script.sh'), null);
  assert.equal(modeFor('javascript', 'example.asar')?.command, 'analyze-javascript-application');
});
test('clean filenames and normalize extension', () => {
  assert.equal(extensionOf('HELLO.EXE'), '.exe');
  assert.equal(cleanFilename('../../foo.exe').includes('/'), false);
  assert.equal(cleanFilename('a\u0000b'), 'a_b');
});
test('session verifies signature and expiration', () => {
  const secret = randomBytes(32).toString('hex'), exp = Date.now() + 60000;
  const token = signSession({ role: 'admin', exp }, secret);
  assert.equal(verifySession(token, secret)?.role, 'admin');
  assert.equal(verifySession(token + 'X', secret), null);
  assert.equal(verifySession(token, secret, exp + 1), null);
  assert.equal(verifySession(token, 'not-the-secret'), null);
});
test('preset commands are hardcoded static analyses', () => {
  for (const preset of Object.values(MODES)) {
    assert.match(preset.command, /^[a-z][a-z0-9-]+$/);
    assert.ok(!preset.command.includes('run-process'));
  }
});

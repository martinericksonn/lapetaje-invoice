import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveOpenCommand } from '../src/open.js';

test('darwin uses open', () => {
  const { cmd, args } = resolveOpenCommand('darwin', '/tmp/x.pdf');
  assert.equal(cmd, 'open');
  assert.deepEqual(args, ['/tmp/x.pdf']);
});

test('linux uses xdg-open', () => {
  const { cmd, args } = resolveOpenCommand('linux', '/tmp/x.pdf');
  assert.equal(cmd, 'xdg-open');
  assert.deepEqual(args, ['/tmp/x.pdf']);
});

test('win32 uses start with empty title', () => {
  const { cmd, args } = resolveOpenCommand('win32', 'C:\\x.pdf');
  assert.equal(cmd, 'cmd');
  assert.deepEqual(args, ['/c', 'start', '', 'C:\\x.pdf']);
});

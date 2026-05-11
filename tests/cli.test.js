import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/cli.js';

test('parseArgs: no args = generate command with empty opts', () => {
  const { command, opts } = parseArgs([]);
  assert.equal(command, 'generate');
  assert.deepEqual(opts.flags, {});
});

test('parseArgs: --help', () => {
  const { command } = parseArgs(['--help']);
  assert.equal(command, 'help');
});

test('parseArgs: --version', () => {
  const { command } = parseArgs(['--version']);
  assert.equal(command, 'version');
});

test('parseArgs: init subcommand', () => {
  const { command } = parseArgs(['init']);
  assert.equal(command, 'init');
});

test('parseArgs: ytd subcommand', () => {
  const { command } = parseArgs(['ytd']);
  assert.equal(command, 'ytd');
});

test('parseArgs: --hours flag', () => {
  const { command, opts } = parseArgs(['--hours', '152']);
  assert.equal(command, 'generate');
  assert.equal(opts.flags.hours, 152);
});

test('parseArgs: --amount, --date, --period, --number flags', () => {
  const { opts } = parseArgs([
    '--amount', '4000',
    '--date', '20 May 2026',
    '--period', 'April 21 - May 20',
    '--number', '30',
  ]);
  assert.equal(opts.flags.amount, 4000);
  assert.equal(opts.flags.date, '20 May 2026');
  assert.equal(opts.flags.period, 'April 21 - May 20');
  assert.equal(opts.flags.number, 30);
});

test('parseArgs: --preview and --force boolean flags', () => {
  const { opts } = parseArgs(['--preview', '--force']);
  assert.equal(opts.flags.preview, true);
  assert.equal(opts.flags.force, true);
});

test('parseArgs: rejects negative hours', () => {
  assert.throws(() => parseArgs(['--hours', '-1']), /positive/);
});

test('parseArgs: rejects non-numeric amount', () => {
  assert.throws(() => parseArgs(['--amount', 'fifty']), /positive/);
});

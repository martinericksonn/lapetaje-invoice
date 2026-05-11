import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateConfig, loadConfig } from '../src/config.js';

const VALID = {
  from: { name: 'A', country: 'X', email: 'a@x.com' },
  billTo: { name: 'B', country: 'Y', email: 'b@y.com' },
  bank: { name: 'Bank', swift: 'AAAAAA', account: '111' },
  rate: 50,
  currency: 'USD',
  currencySymbol: '$',
  defaultHours: 160,
  startingInvoiceNumber: 1,
};

test('validateConfig: returns null for valid config', () => {
  assert.equal(validateConfig(VALID), null);
});

test('validateConfig: reports missing top-level field', () => {
  const { rate, ...rest } = VALID;
  const errors = validateConfig(rest);
  assert.ok(errors);
  assert.ok(errors.some((e) => e.includes('rate')));
});

test('validateConfig: reports missing nested field', () => {
  const cfg = { ...VALID, bank: { name: 'B', swift: 'A' } };
  const errors = validateConfig(cfg);
  assert.ok(errors);
  assert.ok(errors.some((e) => e.includes('bank.account')));
});

test('validateConfig: rejects non-numeric rate', () => {
  const cfg = { ...VALID, rate: 'fifty' };
  const errors = validateConfig(cfg);
  assert.ok(errors);
  assert.ok(errors.some((e) => e.includes('rate')));
});

test('validateConfig: rejects negative rate', () => {
  const cfg = { ...VALID, rate: -1 };
  const errors = validateConfig(cfg);
  assert.ok(errors);
  assert.ok(errors.some((e) => e.includes('rate')));
});

test('loadConfig: missing file returns specific error', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'invoice-test-'));
  try {
    assert.throws(() => loadConfig(dir), /config\.local\.json not found/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig: valid file loads', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'invoice-test-'));
  try {
    fs.writeFileSync(path.join(dir, 'config.local.json'), JSON.stringify(VALID));
    const config = loadConfig(dir);
    assert.equal(config.rate, 50);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig: invalid file throws with field list', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'invoice-test-'));
  try {
    fs.writeFileSync(path.join(dir, 'config.local.json'), JSON.stringify({ rate: 50 }));
    assert.throws(() => loadConfig(dir), /from\.name/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

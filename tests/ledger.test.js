import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadState,
  saveState,
  appendHistory,
  findDuplicate,
  yearToDate,
} from '../src/ledger.js';

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'invoice-ledger-'));
}

const ENTRY = {
  number: 29,
  issueDate: '2026-04-20',
  periodStart: '2026-03-21',
  periodEnd: '2026-04-20',
  hours: 160,
  rate: 46.875,
  amount: 7500,
  currency: 'DKK',
};

test('loadState: bootstraps when file missing', () => {
  const dir = mkTmp();
  try {
    const state = loadState(dir, 30);
    assert.equal(state.lastInvoiceNumber, 29);
    assert.deepEqual(state.history, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadState: reads existing file', () => {
  const dir = mkTmp();
  try {
    const data = { lastInvoiceNumber: 29, history: [ENTRY] };
    fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(data));
    const state = loadState(dir, 1);
    assert.equal(state.lastInvoiceNumber, 29);
    assert.equal(state.history.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadState: corrupt JSON throws', () => {
  const dir = mkTmp();
  try {
    fs.writeFileSync(path.join(dir, 'state.json'), 'not json');
    assert.throws(() => loadState(dir, 1), /not valid JSON/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('saveState: round-trips', () => {
  const dir = mkTmp();
  try {
    const state = { lastInvoiceNumber: 5, history: [ENTRY] };
    saveState(dir, state);
    const loaded = loadState(dir, 1);
    assert.equal(loaded.lastInvoiceNumber, 5);
    assert.equal(loaded.history.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('appendHistory: immutability', () => {
  const original = { lastInvoiceNumber: 28, history: [] };
  const next = appendHistory(original, ENTRY);
  assert.equal(original.history.length, 0);
  assert.equal(next.history.length, 1);
  assert.equal(next.lastInvoiceNumber, 29);
});

test('appendHistory: does not bump lastInvoiceNumber if new entry has equal/lower number', () => {
  const original = { lastInvoiceNumber: 30, history: [] };
  const next = appendHistory(original, ENTRY);
  assert.equal(next.lastInvoiceNumber, 30);
});

test('findDuplicate: matches on period pair', () => {
  const state = { lastInvoiceNumber: 29, history: [ENTRY] };
  const dup = findDuplicate(state, '2026-03-21', '2026-04-20');
  assert.equal(dup.number, 29);
});

test('findDuplicate: returns null on no match', () => {
  const state = { lastInvoiceNumber: 29, history: [ENTRY] };
  const dup = findDuplicate(state, '2026-04-21', '2026-05-20');
  assert.equal(dup, null);
});

test('yearToDate: filters by issueDate year', () => {
  const state = {
    lastInvoiceNumber: 29,
    history: [
      { ...ENTRY, number: 25, issueDate: '2025-12-20' },
      { ...ENTRY, number: 26, issueDate: '2026-01-20' },
      { ...ENTRY, number: 27, issueDate: '2026-02-20' },
    ],
  };
  const entries = yearToDate(state, 2026);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].number, 26);
});

test('yearToDate: empty when no matches', () => {
  const state = { lastInvoiceNumber: 0, history: [] };
  assert.deepEqual(yearToDate(state, 2026), []);
});

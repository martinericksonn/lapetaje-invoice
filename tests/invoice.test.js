import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDocDef, computeTotal } from '../src/invoice.js';

const DATA = {
  number: 29,
  issueDate: '20 April 2026',
  period: 'March 21 - April 20',
  from:   { name: 'Martin Erickson Lapetaje', country: 'Philippines', email: 'mel@datadiscoverylab.com' },
  billTo: { name: 'Frank Pap', country: 'Denmark', email: 'fp@datadiscoverylab.com' },
  bank:   { name: 'Union Bank of the Philippines', swift: 'UBPHPHMMXXX', account: '1093 2902 8616' },
  items: [{ name: 'Rendered Hours', subline: 'March 21 - April 20', quantity: 160, rate: 46.875, amount: 7500 }],
  total: 7500,
  currency: 'DKK',
  currencySymbol: 'kr',
};

test('computeTotal: sums item amounts', () => {
  assert.equal(computeTotal([{ amount: 7500 }]), 7500);
  assert.equal(computeTotal([{ amount: 100 }, { amount: 200.5 }]), 300.5);
});

test('computeTotal: rounds to 2dp', () => {
  assert.equal(computeTotal([{ amount: 0.1 }, { amount: 0.2 }]), 0.3);
});

test('buildDocDef: returns object with content array', () => {
  const doc = buildDocDef(DATA);
  assert.equal(typeof doc, 'object');
  assert.ok(Array.isArray(doc.content));
  assert.ok(doc.content.length > 0);
});

test('buildDocDef: contains the invoice number', () => {
  const doc = buildDocDef(DATA);
  const stringified = JSON.stringify(doc);
  assert.ok(stringified.includes('NO.29'));
});

test('buildDocDef: contains the period', () => {
  const doc = buildDocDef(DATA);
  const stringified = JSON.stringify(doc);
  assert.ok(stringified.includes('March 21 - April 20'));
});

test('buildDocDef: contains the bank account', () => {
  const doc = buildDocDef(DATA);
  const stringified = JSON.stringify(doc);
  assert.ok(stringified.includes('1093 2902 8616'));
});

test('buildDocDef: contains formatted total', () => {
  const doc = buildDocDef(DATA);
  const stringified = JSON.stringify(doc);
  assert.ok(stringified.includes('kr 7,500.00'));
});

test('buildDocDef: handles multiple items', () => {
  const multi = {
    ...DATA,
    items: [
      { name: 'Rendered Hours', subline: 'March 21 - April 20', quantity: 160, rate: 46.875, amount: 7500 },
      { name: 'Bonus', subline: '', quantity: 1, rate: 500, amount: 500 },
    ],
    total: 8000,
  };
  const doc = buildDocDef(multi);
  const stringified = JSON.stringify(doc);
  assert.ok(stringified.includes('Bonus'));
  assert.ok(stringified.includes('kr 8,000.00'));
});

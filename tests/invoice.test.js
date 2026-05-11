import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHtml, computeTotal } from '../src/invoice.js';

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

test('buildHtml: returns a non-empty html string', () => {
  const html = buildHtml(DATA);
  assert.equal(typeof html, 'string');
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('</html>'));
});

test('buildHtml: contains the invoice number', () => {
  const html = buildHtml(DATA);
  assert.ok(/No\.\s*29/.test(html));
});

test('buildHtml: contains the period', () => {
  const html = buildHtml(DATA);
  assert.ok(html.includes('March 21 - April 20'));
});

test('buildHtml: contains the bank account', () => {
  const html = buildHtml(DATA);
  assert.ok(html.includes('1093 2902 8616'));
});

test('buildHtml: contains the formatted total', () => {
  const html = buildHtml(DATA);
  assert.ok(/kr(\s|&nbsp;)7,500\.00/.test(html));
});

test('buildHtml: handles multiple items', () => {
  const multi = {
    ...DATA,
    items: [
      { name: 'Rendered Hours', subline: 'March 21 - April 20', quantity: 160, rate: 46.875, amount: 7500 },
      { name: 'Bonus', subline: '', quantity: 1, rate: 500, amount: 500 },
    ],
    total: 8000,
  };
  const html = buildHtml(multi);
  assert.ok(html.includes('Bonus'));
  assert.ok(/kr(\s|&nbsp;)8,000\.00/.test(html));
});

test('buildHtml: escapes html-special characters in user input', () => {
  const dangerous = {
    ...DATA,
    billTo: { name: 'A <script> & "B"', country: 'X', email: 'b@x.com' },
  };
  const html = buildHtml(dangerous);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&amp;'));
  assert.ok(html.includes('&quot;'));
  assert.ok(!html.includes('<script>'));
});

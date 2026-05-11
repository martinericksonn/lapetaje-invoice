import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount, formatRate } from '../src/format.js';

test('formatAmount: integer with thousands separator', () => {
  assert.equal(formatAmount(7500), '7,500.00');
});

test('formatAmount: zero', () => {
  assert.equal(formatAmount(0), '0.00');
});

test('formatAmount: one decimal expands to two', () => {
  assert.equal(formatAmount(47.5), '47.50');
});

test('formatAmount: two decimals preserved', () => {
  assert.equal(formatAmount(47.59), '47.59');
});

test('formatAmount: half-up rounding at .005', () => {
  assert.equal(formatAmount(0.005), '0.01');
});

test('formatAmount: half-up rounding at 1.005 (floating point error case)', () => {
  assert.equal(formatAmount(1.005), '1.01');
});

test('formatAmount: negative numbers', () => {
  assert.equal(formatAmount(-100.5), '-100.50');
});

test('formatAmount: large numbers with multiple thousands groups', () => {
  assert.equal(formatAmount(1234567.89), '1,234,567.89');
});

test('formatRate: integer rate shows no decimals', () => {
  assert.equal(formatRate(50), '50');
});

test('formatRate: one decimal kept', () => {
  assert.equal(formatRate(50.5), '50.5');
});

test('formatRate: three decimals kept', () => {
  assert.equal(formatRate(46.875), '46.875');
});

test('formatRate: trailing zero stripped from two decimals', () => {
  assert.equal(formatRate(50.0), '50');
});

test('formatRate: rounds to 3dp when more precision given', () => {
  assert.equal(formatRate(50.00049), '50');
});

test('formatRate: rounds half-up at 4th decimal', () => {
  assert.equal(formatRate(50.0005), '50.001');
});

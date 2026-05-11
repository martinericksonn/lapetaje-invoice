import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultCycle,
  cycleFromDate,
  cycleFromPeriod,
  formatDisplayDate,
  formatPeriod,
  parseDisplayDate,
  parsePeriod,
} from '../src/dates.js';

const d = (s) => new Date(`${s}T00:00:00Z`);

test('defaultCycle: today before the 20th picks current month cycle', () => {
  const c = defaultCycle(d('2026-05-11'));
  assert.equal(c.start.toISOString().slice(0, 10), '2026-04-21');
  assert.equal(c.end.toISOString().slice(0, 10), '2026-05-20');
});

test('defaultCycle: today is the 20th picks current month cycle', () => {
  const c = defaultCycle(d('2026-05-20'));
  assert.equal(c.start.toISOString().slice(0, 10), '2026-04-21');
  assert.equal(c.end.toISOString().slice(0, 10), '2026-05-20');
});

test('defaultCycle: today is the 21st picks next month cycle', () => {
  const c = defaultCycle(d('2026-05-21'));
  assert.equal(c.start.toISOString().slice(0, 10), '2026-05-21');
  assert.equal(c.end.toISOString().slice(0, 10), '2026-06-20');
});

test('defaultCycle: year boundary (Dec 25 -> Jan 20 next year)', () => {
  const c = defaultCycle(d('2026-12-25'));
  assert.equal(c.start.toISOString().slice(0, 10), '2026-12-21');
  assert.equal(c.end.toISOString().slice(0, 10), '2027-01-20');
});

test('defaultCycle: leap-year February', () => {
  const c = defaultCycle(d('2024-02-15'));
  assert.equal(c.start.toISOString().slice(0, 10), '2024-01-21');
  assert.equal(c.end.toISOString().slice(0, 10), '2024-02-20');
});

test('cycleFromDate: invoice date determines cycle end', () => {
  const c = cycleFromDate(d('2026-05-20'));
  assert.equal(c.start.toISOString().slice(0, 10), '2026-04-21');
  assert.equal(c.end.toISOString().slice(0, 10), '2026-05-20');
});

test('cycleFromDate: only 20ths are valid invoice dates', () => {
  assert.throws(() => cycleFromDate(d('2026-05-15')), /20th/);
});

test('cycleFromPeriod: passthrough on valid period', () => {
  const c = cycleFromPeriod({ start: d('2026-04-21'), end: d('2026-05-20') });
  assert.equal(c.start.toISOString().slice(0, 10), '2026-04-21');
  assert.equal(c.end.toISOString().slice(0, 10), '2026-05-20');
});

test('cycleFromPeriod: rejects non 21->20 spans', () => {
  assert.throws(
    () => cycleFromPeriod({ start: d('2026-04-22'), end: d('2026-05-20') }),
    /21st/,
  );
});

test('formatDisplayDate', () => {
  assert.equal(formatDisplayDate(d('2026-05-20')), '20 May 2026');
  assert.equal(formatDisplayDate(d('2026-01-05')), '5 January 2026');
});

test('formatPeriod', () => {
  const start = d('2026-03-21');
  const end = d('2026-04-20');
  assert.equal(formatPeriod(start, end), 'March 21 – April 20');
});

test('parseDisplayDate', () => {
  const date = parseDisplayDate('20 May 2026');
  assert.equal(date.toISOString().slice(0, 10), '2026-05-20');
});

test('parseDisplayDate: rejects bad input', () => {
  assert.throws(() => parseDisplayDate('5/20/2026'), /format/);
});

test('parsePeriod: same-year', () => {
  const { start, end } = parsePeriod('April 21 - May 20', 2026);
  assert.equal(start.toISOString().slice(0, 10), '2026-04-21');
  assert.equal(end.toISOString().slice(0, 10), '2026-05-20');
});

test('parsePeriod: en-dash accepted', () => {
  const { start, end } = parsePeriod('April 21 – May 20', 2026);
  assert.equal(start.toISOString().slice(0, 10), '2026-04-21');
  assert.equal(end.toISOString().slice(0, 10), '2026-05-20');
});

test('parsePeriod: year boundary (December -> January)', () => {
  const { start, end } = parsePeriod('December 21 - January 20', 2027);
  assert.equal(start.toISOString().slice(0, 10), '2026-12-21');
  assert.equal(end.toISOString().slice(0, 10), '2027-01-20');
});

test('parsePeriod: rejects bad input', () => {
  assert.throws(() => parsePeriod('Apr 21 to May 20', 2026), /format/);
});

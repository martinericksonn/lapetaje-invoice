import fs from 'node:fs';
import path from 'node:path';

function statePath(cwd) {
  return path.join(cwd, 'state.json');
}

export function loadState(cwd, startingInvoiceNumber) {
  const file = statePath(cwd);
  if (!fs.existsSync(file)) {
    return { lastInvoiceNumber: startingInvoiceNumber - 1, history: [] };
  }
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (e) {
    const err = new Error(`Failed to read state.json: ${e.message}`);
    err.exitCode = 3;
    throw err;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    const err = new Error('state.json is not valid JSON. Fix or delete it to reset.');
    err.exitCode = 3;
    throw err;
  }
}

export function saveState(cwd, state) {
  const file = statePath(cwd);
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

export function appendHistory(state, entry) {
  const history = [...state.history, entry];
  const lastInvoiceNumber = Math.max(state.lastInvoiceNumber, entry.number);
  return { lastInvoiceNumber, history };
}

export function findDuplicate(state, periodStart, periodEnd) {
  return (
    state.history.find(
      (e) => e.periodStart === periodStart && e.periodEnd === periodEnd,
    ) || null
  );
}

export function yearToDate(state, year) {
  const prefix = `${year}-`;
  return state.history.filter((e) => e.issueDate.startsWith(prefix));
}

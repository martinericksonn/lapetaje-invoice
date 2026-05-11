import fs from 'node:fs';
import path from 'node:path';

const STRING_FIELDS = [
  'from.name', 'from.country', 'from.email',
  'billTo.name', 'billTo.country', 'billTo.email',
  'bank.name', 'bank.swift', 'bank.account',
  'currency', 'currencySymbol',
];

const POSITIVE_NUMBER_FIELDS = ['monthlyAmount', 'defaultHours', 'startingInvoiceNumber'];

function getPath(obj, dottedPath) {
  return dottedPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

export function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') {
    return ['config: must be a JSON object'];
  }
  for (const field of STRING_FIELDS) {
    const value = getPath(config, field);
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`${field}: required non-empty string`);
    }
  }
  for (const field of POSITIVE_NUMBER_FIELDS) {
    const value = getPath(config, field);
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      errors.push(`${field}: required positive number`);
    }
  }
  return errors.length ? errors : null;
}

export function loadConfig(cwd) {
  const file = path.join(cwd, 'config.local.json');
  if (!fs.existsSync(file)) {
    const err = new Error('config.local.json not found. Run `invoice init` to create one.');
    err.exitCode = 2;
    throw err;
  }
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (e) {
    const err = new Error(`Failed to read config.local.json: ${e.message}`);
    err.exitCode = 3;
    throw err;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const err = new Error(`config.local.json is not valid JSON: ${e.message}`);
    err.exitCode = 2;
    throw err;
  }
  const errors = validateConfig(parsed);
  if (errors) {
    const err = new Error(`Invalid config.local.json:\n  - ${errors.join('\n  - ')}`);
    err.exitCode = 2;
    throw err;
  }
  return parsed;
}

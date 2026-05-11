import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function prompt(rl, label, defaultValue) {
  const suffix = defaultValue !== undefined ? ` (${defaultValue})` : '';
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  if (!answer && defaultValue !== undefined) return defaultValue;
  return answer;
}

async function promptNumber(rl, label, defaultValue) {
  while (true) {
    const raw = await prompt(rl, label, defaultValue !== undefined ? String(defaultValue) : undefined);
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
    output.write('  Must be a positive number.\n');
  }
}

export async function runInit(cwd) {
  const target = path.join(cwd, 'config.local.json');
  if (fs.existsSync(target)) {
    const err = new Error('config.local.json already exists. Edit it manually or delete it first.');
    err.exitCode = 1;
    throw err;
  }
  const rl = readline.createInterface({ input, output });
  try {
    output.write('\nlapetaje-invoice setup\n----------------------\n\n');

    const config = {
      from: {
        name: await prompt(rl, 'Your full name'),
        country: await prompt(rl, 'Your country'),
        email: await prompt(rl, 'Your email'),
      },
      billTo: {
        name: await prompt(rl, 'Client name'),
        country: await prompt(rl, 'Client country'),
        email: await prompt(rl, 'Client email'),
      },
      bank: {
        name: await prompt(rl, 'Bank name'),
        swift: await prompt(rl, 'SWIFT code'),
        account: await prompt(rl, 'Account number'),
      },
      rate: await promptNumber(rl, 'Hourly rate'),
      currency: await prompt(rl, 'Currency code', 'DKK'),
      currencySymbol: await prompt(rl, 'Currency symbol', 'kr'),
      defaultHours: await promptNumber(rl, 'Default monthly hours', 160),
      startingInvoiceNumber: await promptNumber(rl, 'Starting invoice number', 1),
    };

    fs.writeFileSync(target, JSON.stringify(config, null, 2) + '\n', 'utf8');
    output.write(`\nWrote ${target}\n`);
  } finally {
    rl.close();
  }
}

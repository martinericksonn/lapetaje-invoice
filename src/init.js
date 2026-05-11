import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

/**
 * Build a question function from stdin.
 *
 * When stdin is a TTY we use readline interactively.
 * When stdin is a pipe (non-TTY) we buffer all lines upfront so that
 * multiple sequential question() calls each get a distinct answer — the
 * readline/promises async-iterator drains the stream on the first call
 * which breaks piped input on Node ≤22.
 */
async function makeAsk() {
  if (input.isTTY) {
    const rl = createInterface({ input, output });
    const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
    ask.close = () => rl.close();
    return ask;
  }

  // Non-TTY (pipe/heredoc): buffer all lines first.
  const lines = [];
  await new Promise((resolve) => {
    const rl = createInterface({ input, terminal: false });
    rl.on('line', (l) => lines.push(l));
    rl.on('close', resolve);
  });
  let idx = 0;
  const ask = (q) => {
    output.write(q);
    const answer = lines[idx++] ?? '';
    output.write(answer + '\n');
    return Promise.resolve(answer);
  };
  ask.close = () => {};
  return ask;
}

async function prompt(ask, label, defaultValue) {
  const suffix = defaultValue !== undefined ? ` (${defaultValue})` : '';
  const answer = (await ask(`${label}${suffix}: `)).trim();
  if (!answer && defaultValue !== undefined) return defaultValue;
  return answer;
}

async function promptNumber(ask, label, defaultValue) {
  while (true) {
    const raw = await prompt(ask, label, defaultValue !== undefined ? String(defaultValue) : undefined);
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
  const ask = await makeAsk();
  try {
    output.write('\nlapetaje-invoice setup\n----------------------\n\n');

    const config = {
      from: {
        name: await prompt(ask, 'Your full name'),
        country: await prompt(ask, 'Your country'),
        email: await prompt(ask, 'Your email'),
      },
      billTo: {
        name: await prompt(ask, 'Client name'),
        country: await prompt(ask, 'Client country'),
        email: await prompt(ask, 'Client email'),
      },
      bank: {
        name: await prompt(ask, 'Bank name'),
        swift: await prompt(ask, 'SWIFT code'),
        account: await prompt(ask, 'Account number'),
      },
      rate: await promptNumber(ask, 'Hourly rate'),
      currency: await prompt(ask, 'Currency code', 'DKK'),
      currencySymbol: await prompt(ask, 'Currency symbol', 'kr'),
      defaultHours: await promptNumber(ask, 'Default monthly hours', 160),
      startingInvoiceNumber: await promptNumber(ask, 'Starting invoice number', 1),
    };

    fs.writeFileSync(target, JSON.stringify(config, null, 2) + '\n', 'utf8');
    output.write(`\nWrote ${target}\n`);
  } finally {
    ask.close();
  }
}

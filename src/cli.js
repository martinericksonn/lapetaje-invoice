import fs from 'node:fs';
import path from 'node:path';
import mri from 'mri';
import { loadConfig } from './config.js';
import { loadState, saveState, appendHistory, findDuplicate, yearToDate } from './ledger.js';
import {
  defaultCycle,
  cycleFromDate,
  parsePeriod,
  parseDisplayDate,
  formatDisplayDate,
  formatPeriod,
} from './dates.js';
import { buildHtml, renderPdf, computeTotal, buildMetadata } from './invoice.js';
import { formatAmount, formatRate } from './format.js';
import { openFile } from './open.js';
import { runInit } from './init.js';

const USAGE = `Usage: invoice [command] [options]

Commands:
  (none)        Generate next invoice (default)
  init          Interactive setup of config.local.json
  ytd           Show year-to-date earnings
  --help        Show this help
  --version     Show version

Generate options:
  --hours N        Override default hours
  --amount N       Override monthly amount (rate is derived: amount / hours)
  --period STR     Override period ("April 21 - May 20")
  --date STR       Override invoice date ("20 May 2026")
  --number N       Force invoice number
  --force          Bypass duplicate-period check
  --preview        Print summary, don't write PDF or update state
  --dry-run        Write PDF to output/dry-run.pdf, don't update state
  --no-open        Don't open PDF after generation
`;

function readPackageVersion() {
  const url = new URL('../package.json', import.meta.url);
  return JSON.parse(fs.readFileSync(url, 'utf8')).version;
}

function assertPositive(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    const err = new Error(`--${name} must be a positive number, got: ${value}`);
    err.exitCode = 1;
    throw err;
  }
}

/**
 * Extract raw string values for named numeric flags before mri sees them,
 * so that negative values like `--hours -1` are captured correctly
 * (mri treats leading-dash tokens as new flags, not values).
 */
function extractNumericFlag(argv, name) {
  for (let i = 0; i < argv.length - 1; i++) {
    if (argv[i] === `--${name}`) {
      return { value: argv[i + 1], argv: [...argv.slice(0, i), ...argv.slice(i + 2)] };
    }
  }
  return { value: undefined, argv };
}

export function parseArgs(argv) {
  let hoursRaw, amountRaw, numberRaw;
  ({ value: hoursRaw, argv } = extractNumericFlag(argv, 'hours'));
  ({ value: amountRaw, argv } = extractNumericFlag(argv, 'amount'));
  ({ value: numberRaw, argv } = extractNumericFlag(argv, 'number'));

  const parsed = mri(argv, {
    boolean: ['help', 'version', 'preview', 'force', 'no-open', 'dry-run'],
    string: ['date', 'period'],
    alias: { h: 'help', v: 'version' },
    default: { open: true },
  });
  if (parsed.help) return { command: 'help', opts: { flags: {} } };
  if (parsed.version) return { command: 'version', opts: { flags: {} } };

  const subcommand = parsed._[0];
  const flags = {};

  if (hoursRaw !== undefined) { flags.hours = Number(hoursRaw); assertPositive('hours', flags.hours); }
  if (amountRaw !== undefined) { flags.amount = Number(amountRaw); assertPositive('amount', flags.amount); }
  if (numberRaw !== undefined) { flags.number = Number(numberRaw); assertPositive('number', flags.number); }
  if (parsed.date) flags.date = parsed.date;
  if (parsed.period) flags.period = parsed.period;
  if (parsed.preview) flags.preview = true;
  if (parsed.force) flags.force = true;
  if (parsed['dry-run']) flags.dryRun = true;
  if (parsed.open === false) flags.noOpen = true;

  if (subcommand === 'init') return { command: 'init', opts: { flags } };
  if (subcommand === 'ytd') return { command: 'ytd', opts: { flags } };
  return { command: 'generate', opts: { flags } };
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function summarize(invoice) {
  return [
    `  Number: ${invoice.number}`,
    `  Period: ${invoice.period}`,
    `  Date:   ${invoice.issueDate}`,
    `  ${invoice.items[0].quantity}h × ${invoice.currencySymbol} ${formatRate(invoice.items[0].rate)} = ${invoice.currencySymbol} ${formatAmount(invoice.total)} ${invoice.currency}`,
  ].join('\n');
}

async function generate(cwd, flags) {
  const config = loadConfig(cwd);
  const state = loadState(cwd, config.startingInvoiceNumber);

  let cycle;
  if (flags.date && flags.period) {
    const start = parsePeriod(flags.period, parseDisplayDate(flags.date).getUTCFullYear()).start;
    const end = parseDisplayDate(flags.date);
    cycle = { start, end };
  } else if (flags.date) {
    cycle = cycleFromDate(parseDisplayDate(flags.date));
  } else if (flags.period) {
    cycle = parsePeriod(flags.period, new Date().getUTCFullYear());
  } else {
    cycle = defaultCycle(new Date());
  }

  const hours = flags.hours ?? config.defaultHours;
  const amount = flags.amount ?? config.monthlyAmount;
  const rate = Math.round((amount / hours) * 1000) / 1000;
  const total = computeTotal([{ amount }]);
  const number = flags.number ?? state.lastInvoiceNumber + 1;
  const issueDate = formatDisplayDate(cycle.end);
  const period = formatPeriod(cycle.start, cycle.end);

  if (!flags.preview && !flags.force && !flags.dryRun) {
    const dup = findDuplicate(state, isoDate(cycle.start), isoDate(cycle.end));
    if (dup) {
      const err = new Error(
        `Invoice ${dup.number} already covers ${period} (issued ${dup.issueDate}). Use --force to overwrite or --period to invoice a different cycle.`,
      );
      err.exitCode = 1;
      throw err;
    }
  }

  const invoice = {
    number,
    issueDate,
    period,
    from: config.from,
    billTo: config.billTo,
    bank: config.bank,
    items: [{ name: 'Rendered Hours', subline: period, quantity: hours, rate, amount }],
    total,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
  };

  if (flags.preview) {
    process.stdout.write('Preview (no files written)\n');
    process.stdout.write(summarize(invoice) + '\n');
    return;
  }

  const html = buildHtml(invoice);
  const buffer = await renderPdf(html, buildMetadata(invoice));

  const outputDir = path.join(cwd, 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  const fileName = flags.dryRun ? 'dry-run.pdf' : `lapetaje-invoice-${number}.pdf`;
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, buffer);

  if (!flags.dryRun) {
    const historyEntry = {
      number,
      issueDate: isoDate(cycle.end),
      periodStart: isoDate(cycle.start),
      periodEnd: isoDate(cycle.end),
      hours,
      rate,
      amount: total,
      currency: config.currency,
    };
    saveState(cwd, appendHistory(state, historyEntry));
  }

  process.stdout.write(`${flags.dryRun ? '⚙ dry-run' : '✓'} ${path.relative(cwd, outputPath)}\n`);
  process.stdout.write(summarize(invoice) + '\n');

  if (!flags.noOpen) openFile(outputPath);
}

function ytd(cwd) {
  const config = loadConfig(cwd);
  const state = loadState(cwd, config.startingInvoiceNumber);
  const year = new Date().getUTCFullYear();
  const entries = yearToDate(state, year);
  if (entries.length === 0) {
    process.stdout.write(`No invoices issued in ${year}.\n`);
    return;
  }
  process.stdout.write(`${year} year-to-date\n\n`);
  let totalHours = 0;
  let totalAmount = 0;
  for (const e of entries) {
    const issuedDate = new Date(`${e.issueDate}T00:00:00Z`);
    const periodStr = formatPeriod(
      new Date(`${e.periodStart}T00:00:00Z`),
      new Date(`${e.periodEnd}T00:00:00Z`),
    );
    const dateStr = formatDisplayDate(issuedDate).replace(/ \d{4}$/, '');
    process.stdout.write(
      `  Invoice ${String(e.number).padEnd(4)} ${dateStr.padEnd(12)} ${periodStr.padEnd(28)} ${String(e.hours).padStart(3)}h   ${config.currencySymbol} ${formatAmount(e.amount)}\n`,
    );
    totalHours += e.hours;
    totalAmount += e.amount;
  }
  process.stdout.write(
    `\nTotal: ${entries.length} invoice${entries.length === 1 ? '' : 's'} · ${totalHours} hours · ${config.currencySymbol} ${formatAmount(totalAmount)} ${config.currency}\n`,
  );
}

export async function main(argv) {
  const { command, opts } = parseArgs(argv);
  const cwd = process.cwd();

  if (command === 'help') { process.stdout.write(USAGE); return 0; }
  if (command === 'version') { process.stdout.write(readPackageVersion() + '\n'); return 0; }
  if (command === 'init') { await runInit(cwd); return 0; }
  if (command === 'ytd') { ytd(cwd); return 0; }
  await generate(cwd, opts.flags);
  return 0;
}

import { createRequire } from 'node:module';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { formatAmount, formatRate } from './format.js';

const require = createRequire(import.meta.url);

const FONT_DIR = path.dirname(
  require.resolve('@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'),
);

function fontUrl() {
  return `file://${path.join(FONT_DIR, 'geist-latin-wght-normal.woff2')}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function computeTotal(items) {
  const sum = items.reduce((acc, item) => acc + item.amount, 0);
  return Math.round(sum * 100) / 100;
}

export function buildHtml(data) {
  const {
    from, billTo, bank, currencySymbol, currency,
    items, total, number, issueDate, period,
  } = data;

  const itemRows = items
    .map((item) => {
      const subParts = [];
      if (item.subline) subParts.push(escapeHtml(item.subline));
      subParts.push(`${escapeHtml(item.quantity)}h × ${escapeHtml(currencySymbol)}&nbsp;${escapeHtml(formatRate(item.rate))}`);
      return `
      <tr>
        <td class="col-desc">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-sub">${subParts.join(' · ')}</div>
        </td>
        <td class="col-amount">${escapeHtml(currencySymbol)}&nbsp;${escapeHtml(formatAmount(item.amount))}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice No. ${escapeHtml(number)}</title>
<style>
  @font-face {
    font-family: 'Geist';
    font-style: normal;
    font-weight: 100 900;
    src: url('${fontUrl()}') format('woff2-variations');
  }

  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  :root {
    --ink:      #0A0A0A;
    --ink-mid:  #3F3F3F;
    --ink-soft: #6B6B6B;
    --ink-mute: #9CA3AF;
    --paper:    #FFFFFF;
    --hair:     #E7E7E7;
    --hair-bold:#111111;
  }

  body {
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--paper);
    color: var(--ink);
    font-size: 10pt;
    line-height: 1.5;
    padding: 26mm 28mm 24mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-feature-settings: 'kern' 1, 'liga' 1, 'ss01' 1, 'cv11' 1;
    letter-spacing: -0.006em;
  }

  .tabular { font-variant-numeric: tabular-nums lining-nums; }

  .label {
    font-size: 7.5pt;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-mute);
    margin-bottom: 2mm;
    line-height: 1;
  }

  /* ── Top bar: name left, number right ──────────────── */
  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 12mm;
  }
  .top .name {
    font-size: 8.5pt;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink);
  }
  .top .ref {
    font-size: 10pt;
    font-weight: 400;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums lining-nums;
  }

  /* ── Wordmark — big bold sans ──────────────────────── */
  .wordmark {
    font-size: 60pt;
    font-weight: 700;
    line-height: 0.95;
    letter-spacing: -0.052em;
    color: var(--ink);
    margin: 0 0 13mm;
  }

  /* ── Meta grid: 2×2 ────────────────────────────────── */
  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 18mm;
    row-gap: 7mm;
    margin-bottom: 12mm;
  }
  .meta .value {
    font-size: 10.5pt;
    color: var(--ink);
    line-height: 1.5;
  }
  .meta .value.bold {
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.008em;
  }
  .meta .value.mute { color: var(--ink-soft); font-weight: 400; }

  /* ── Items ─────────────────────────────────────────── */
  table.items {
    width: 100%;
    border-collapse: collapse;
    border-top: 0.5pt solid var(--hair);
    margin-bottom: 0;
  }
  table.items thead th {
    text-align: left;
    font-size: 7.5pt;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-mute);
    padding: 4mm 0 4mm;
  }
  table.items thead th.right { text-align: right; }
  table.items tbody tr:last-child td { padding-bottom: 6mm; }
  table.items tbody td {
    padding: 0 0 5mm;
    vertical-align: top;
    font-size: 10.5pt;
  }
  table.items tbody td.col-amount {
    text-align: right;
    width: 36mm;
    font-weight: 600;
    color: var(--ink);
    font-variant-numeric: tabular-nums lining-nums;
    white-space: nowrap;
    letter-spacing: -0.01em;
  }
  .item-name {
    font-size: 10.5pt;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 1mm;
    letter-spacing: -0.008em;
  }
  .item-sub {
    font-size: 8.5pt;
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums lining-nums;
    letter-spacing: 0;
  }

  /* ── Total ─────────────────────────────────────────── */
  .total {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 6mm 0 7mm;
    border-top: 0.5pt solid var(--hair);
    border-bottom: 0.5pt solid var(--hair);
    margin-bottom: 12mm;
  }
  .total .label-text {
    font-size: 10.5pt;
    font-weight: 500;
    color: var(--ink);
    letter-spacing: -0.005em;
  }
  .total .amount-wrap {
    display: flex;
    align-items: baseline;
    gap: 3mm;
  }
  .total .amount {
    font-size: 20pt;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.028em;
    font-variant-numeric: tabular-nums lining-nums;
    line-height: 1;
  }
  .total .ccy {
    font-size: 8.5pt;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-mute);
  }

  /* ── Footer: Payment | Notes ───────────────────────── */
  .footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 18mm;
  }
  .footer .bank-name {
    font-size: 10.5pt;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 1mm;
    letter-spacing: -0.008em;
  }
  .footer .line {
    font-size: 10pt;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums lining-nums;
    line-height: 1.55;
  }
  .footer .line .lbl {
    color: var(--ink-mute);
    margin-right: 1.4mm;
    letter-spacing: 0;
  }
  .footer .notes-text {
    font-size: 10pt;
    color: var(--ink-soft);
    line-height: 1.55;
  }
</style>
</head>
<body>
  <div class="top">
    <div class="name">${escapeHtml(from.name)}</div>
    <div class="ref">No. ${escapeHtml(number)}</div>
  </div>

  <h1 class="wordmark">Invoice</h1>

  <div class="meta">
    <div>
      <div class="label">Issue Date</div>
      <div class="value bold">${escapeHtml(issueDate)}</div>
    </div>
    <div>
      <div class="label">Billing Period</div>
      <div class="value bold">${escapeHtml(period)}</div>
    </div>
    <div>
      <div class="label">Billed To</div>
      <div class="value bold">${escapeHtml(billTo.name)}</div>
      <div class="value mute">${escapeHtml(billTo.country)}</div>
      <div class="value mute">${escapeHtml(billTo.email)}</div>
    </div>
    <div>
      <div class="label">From</div>
      <div class="value bold">${escapeHtml(from.name)}</div>
      <div class="value mute">${escapeHtml(from.country)}</div>
      <div class="value mute">${escapeHtml(from.email)}</div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}
    </tbody>
  </table>

  <div class="total">
    <div class="label-text">Total due</div>
    <div class="amount-wrap">
      <span class="amount">${escapeHtml(currencySymbol)}&nbsp;${escapeHtml(formatAmount(total))}</span>
      <span class="ccy">${escapeHtml(currency)}</span>
    </div>
  </div>

  <div class="footer">
    <div>
      <div class="label">Payment</div>
      <div class="bank-name">${escapeHtml(bank.name)}</div>
      <div class="line"><span class="lbl">SWIFT</span>${escapeHtml(bank.swift)}</div>
      <div class="line"><span class="lbl">Account</span>${escapeHtml(bank.account)}</div>
    </div>
    <div>
      <div class="label">Notes</div>
      <div class="notes-text">Thank you for your business.</div>
    </div>
  </div>
</body>
</html>`;
}

export async function renderPdf(html) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

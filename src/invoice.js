import { createRequire } from 'node:module';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { formatAmount, formatRate } from './format.js';

const require = createRequire(import.meta.url);

const FONT_DIR = path.dirname(require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2'));

function fontUrl(weight) {
  return `file://${path.join(FONT_DIR, `inter-latin-${weight}-normal.woff2`)}`;
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
  const { from, billTo, bank, currencySymbol, currency, items, total, number, issueDate, period } = data;

  const itemRows = items
    .map((item) => {
      const subParts = [];
      if (item.subline) subParts.push(escapeHtml(item.subline));
      subParts.push(`${item.quantity}h × ${escapeHtml(currencySymbol)} ${escapeHtml(formatRate(item.rate))}`);
      return `
      <div class="item-row">
        <div>
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-sub">${subParts.join(' · ')}</div>
        </div>
        <div class="tabular item-amount">${escapeHtml(currencySymbol)} ${escapeHtml(formatAmount(item.amount))}</div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${escapeHtml(number)}</title>
<style>
  @font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; src: url('${fontUrl(400)}') format('woff2'); }
  @font-face { font-family: 'Inter'; font-style: normal; font-weight: 500; src: url('${fontUrl(500)}') format('woff2'); }
  @font-face { font-family: 'Inter'; font-style: normal; font-weight: 600; src: url('${fontUrl(600)}') format('woff2'); }
  @font-face { font-family: 'Inter'; font-style: normal; font-weight: 700; src: url('${fontUrl(700)}') format('woff2'); }
  @font-face { font-family: 'Inter'; font-style: normal; font-weight: 800; src: url('${fontUrl(800)}') format('woff2'); }

  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', sans-serif;
    color: #111;
    font-size: 10.5pt;
    line-height: 1.5;
    padding: 26mm 22mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-feature-settings: 'ss01', 'cv11';
  }

  .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16mm; }
  .name-banner { font-weight: 600; letter-spacing: 0.12em; font-size: 9pt; text-transform: uppercase; }
  .meta-number { color: #999; font-weight: 500; font-variant-numeric: tabular-nums; }

  h1 {
    margin: 0 0 14mm 0;
    font-size: 56pt;
    font-weight: 800;
    letter-spacing: -0.045em;
    line-height: 0.95;
    color: #0a0a0a;
  }

  .meta-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-bottom: 12mm; }
  .label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; color: #9a9a9a; margin-bottom: 2mm; font-weight: 500; }
  .field-name { font-weight: 600; color: #111; }
  .muted { color: #707070; }

  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-bottom: 16mm; }

  .hr { height: 1px; background: #e8e8e8; margin: 6mm 0; }

  .items-header { display: flex; justify-content: space-between; font-weight: 500; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; color: #888; padding-bottom: 3mm; }
  .item-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12mm;
    align-items: start;
    padding: 4mm 0;
  }
  .item-name { font-weight: 500; }
  .item-sub { color: #888; font-size: 9.5pt; margin-top: 1mm; }
  .item-amount { font-weight: 500; font-size: 11pt; }

  .total {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-top: 4mm;
  }
  .total-label { font-size: 11pt; font-weight: 600; color: #444; }
  .total-amount { font-weight: 700; font-size: 18pt; letter-spacing: -0.02em; color: #0a0a0a; }
  .total-currency { font-weight: 500; color: #888; margin-left: 4px; font-size: 11pt; letter-spacing: 0; }

  .footer { margin-top: 22mm; padding-top: 6mm; border-top: 1px solid #e8e8e8; display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; }

  .tabular { font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
  <div class="header">
    <div class="name-banner">${escapeHtml(from.name)}</div>
    <div class="meta-number">No. ${escapeHtml(number)}</div>
  </div>

  <h1>Invoice</h1>

  <div class="meta-row">
    <div>
      <div class="label">Issue date</div>
      <div class="field-name">${escapeHtml(issueDate)}</div>
    </div>
    <div>
      <div class="label">Billing period</div>
      <div class="field-name">${escapeHtml(period)}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="label">Billed to</div>
      <div class="field-name">${escapeHtml(billTo.name)}</div>
      <div class="muted">${escapeHtml(billTo.country)}</div>
      <div class="muted">${escapeHtml(billTo.email)}</div>
    </div>
    <div>
      <div class="label">From</div>
      <div class="field-name">${escapeHtml(from.name)}</div>
      <div class="muted">${escapeHtml(from.country)}</div>
      <div class="muted">${escapeHtml(from.email)}</div>
    </div>
  </div>

  <div class="hr"></div>

  <div class="items-header">
    <div>Description</div>
    <div>Amount</div>
  </div>

  ${itemRows}

  <div class="hr"></div>

  <div class="total">
    <div class="total-label">Total due</div>
    <div>
      <span class="total-amount tabular">${escapeHtml(currencySymbol)} ${escapeHtml(formatAmount(total))}</span>
      <span class="total-currency">${escapeHtml(currency)}</span>
    </div>
  </div>

  <div class="footer">
    <div>
      <div class="label">Payment</div>
      <div class="field-name">${escapeHtml(bank.name)}</div>
      <div class="muted">SWIFT ${escapeHtml(bank.swift)}</div>
      <div class="muted tabular">Account ${escapeHtml(bank.account)}</div>
    </div>
    <div>
      <div class="label">Notes</div>
      <div class="muted">Thank you for your business.</div>
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

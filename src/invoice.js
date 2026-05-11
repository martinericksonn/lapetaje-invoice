import { createRequire } from 'node:module';
import { formatAmount, formatRate } from './format.js';

const require = createRequire(import.meta.url);
const PdfPrinter = require('pdfmake');

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(fonts);

export function computeTotal(items) {
  const sum = items.reduce((acc, item) => acc + item.amount, 0);
  return Math.round(sum * 100) / 100;
}

export function buildDocDef(data) {
  const { currencySymbol, currency } = data;
  const itemRows = data.items.map((item) => [
    {
      stack: [
        { text: item.name, fontSize: 11 },
        item.subline ? { text: item.subline, fontSize: 9, color: '#666666' } : null,
      ].filter(Boolean),
    },
    { text: String(item.quantity), fontSize: 11 },
    { text: `${currencySymbol} ${formatRate(item.rate)}`, fontSize: 11 },
    { text: `${currencySymbol} ${formatAmount(item.amount)}`, fontSize: 11 },
  ]);

  return {
    pageSize: 'A4',
    pageMargins: [60, 60, 60, 60],
    defaultStyle: { font: 'Helvetica', fontSize: 11, color: '#111111' },
    content: [
      {
        columns: [
          { text: data.from.name.toUpperCase(), bold: true, characterSpacing: 1 },
          { text: `NO.${data.number}`, alignment: 'right' },
        ],
      },
      { text: 'INVOICE', fontSize: 56, bold: true, margin: [0, 28, 0, 24] },
      {
        text: [
          { text: 'Date: ', bold: true },
          { text: `  ${data.issueDate}` },
        ],
        margin: [0, 0, 0, 28],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Billed to:', bold: true, margin: [0, 0, 0, 6] },
              { text: data.billTo.name },
              { text: data.billTo.country },
              { text: data.billTo.email },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'From:', bold: true, margin: [0, 0, 0, 6] },
              { text: data.from.name },
              { text: data.from.country },
              { text: data.from.email },
            ],
          },
        ],
        margin: [0, 0, 0, 32],
      },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto'],
          headerRows: 1,
          body: [
            [
              { text: 'Item', fillColor: '#f3f3f3', margin: [6, 8, 6, 8] },
              { text: 'Quantity', fillColor: '#f3f3f3', margin: [6, 8, 6, 8] },
              { text: 'Price', fillColor: '#f3f3f3', margin: [6, 8, 6, 8] },
              { text: 'Amount', fillColor: '#f3f3f3', margin: [6, 8, 6, 8] },
            ],
            ...itemRows.map((row) => row.map((cell) => ({ ...cell, margin: [6, 8, 6, 8] }))),
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 60],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }],
        margin: [0, 0, 0, 12],
      },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            text: [
              { text: 'Total   ', bold: true },
              { text: `${currencySymbol} ${formatAmount(data.total)} ${currency}`, bold: true, fontSize: 12 },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }],
        margin: [0, 0, 0, 60],
      },
      { text: 'Notes to Employer:', bold: true, margin: [0, 0, 0, 10] },
      { text: data.from.name },
      { text: data.bank.name },
      { text: `SWIFT CODE: ${data.bank.swift}` },
      { text: `Account number: ${data.bank.account}` },
    ],
  };
}

export function renderPdf(docDef) {
  return new Promise((resolve, reject) => {
    try {
      const doc = printer.createPdfKitDocument(docDef);
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

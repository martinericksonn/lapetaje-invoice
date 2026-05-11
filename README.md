# lapetaje-invoice

A small Node.js CLI that generates monthly salary invoice PDFs.

One command produces a clean, vector PDF with auto-incrementing invoice numbers,
auto-computed billing periods, and persistent invoice history.

## Install

Requires Node.js 20 or newer.

```bash
git clone https://github.com/martinericksonn/lapetaje-invoice.git
cd lapetaje-invoice
npm install
npm link        # optional — makes `invoice` available globally
```

## First-time setup

```bash
invoice init
```

You'll be prompted for your name, client details, bank info, monthly amount,
currency, default hours, and starting invoice number. The answers are written
to `config.local.json` in the current directory.

The hourly rate shown on the invoice is derived from `monthlyAmount / defaultHours`.

`config.local.json`, `state.json`, and `output/` are all gitignored — your
personal data never enters the repo.

## Daily use

```bash
invoice                       # generate next month's invoice
invoice --preview             # see what would be generated, no write
invoice --hours 152           # override default hours
invoice --amount 4000         # override monthly amount (rate is derived)
invoice --dry-run             # write output/dry-run.pdf, don't update state
invoice --period "April 21 - May 20"
invoice --date "20 May 2026"
invoice --number 30           # force invoice number
invoice --force               # overwrite a period already in history
invoice --no-open             # don't open the PDF after generation
invoice ytd                   # year-to-date summary
invoice --help
invoice --version
```

## How dates work

A billing cycle runs from the 21st of one month through the 20th of the next.
Invoices are dated on the cycle's 20th. Run with no flags and the tool picks
the next 20th from today.

| Run on | Cycle |
|---|---|
| May 11 | April 21 - May 20 |
| May 20 | April 21 - May 20 |
| May 21 | May 21 - June 20 |

## Output

PDFs land in `output/lapetaje-invoice-<number>.pdf`. Every invoice is appended
to `state.json` for the `ytd` command and future accountant exports.

## Configuration

See [`config.example.json`](./config.example.json) for the full shape. All
fields are required.

## Tests

```bash
npm test
```

## License

MIT

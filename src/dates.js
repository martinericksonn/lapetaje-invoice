const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_INDEX = Object.fromEntries(MONTH_NAMES.map((m, i) => [m, i]));

function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month, day));
}

function previousMonth(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 };
}

export function defaultCycle(today) {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const day = today.getUTCDate();
  let endYear = y;
  let endMonth = m;
  if (day > 20) {
    endMonth = m + 1;
    if (endMonth === 12) {
      endMonth = 0;
      endYear = y + 1;
    }
  }
  const end = utcDate(endYear, endMonth, 20);
  const prev = previousMonth(end);
  const start = utcDate(prev.year, prev.month, 21);
  return { start, end };
}

export function cycleFromDate(date) {
  if (date.getUTCDate() !== 20) {
    throw new Error('Invoice date must be the 20th of a month');
  }
  const prev = previousMonth(date);
  const start = utcDate(prev.year, prev.month, 21);
  return { start, end: date };
}

export function cycleFromPeriod({ start, end }) {
  if (start.getUTCDate() !== 21) {
    throw new Error('Period start must be the 21st of a month');
  }
  if (end.getUTCDate() !== 20) {
    throw new Error('Period end must be the 20th of a month');
  }
  return { start, end };
}

export function formatDisplayDate(date) {
  const day = date.getUTCDate();
  const month = MONTH_NAMES[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function formatPeriod(start, end) {
  const startStr = `${MONTH_NAMES[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const endStr = `${MONTH_NAMES[end.getUTCMonth()]} ${end.getUTCDate()}`;
  return `${startStr} - ${endStr}`;
}

const DISPLAY_DATE_RE = /^(\d{1,2}) ([A-Z][a-z]+) (\d{4})$/;

export function parseDisplayDate(input) {
  const match = DISPLAY_DATE_RE.exec(input.trim());
  if (!match) {
    throw new Error(`Could not parse date "${input}". Expected format: "20 May 2026"`);
  }
  const day = Number(match[1]);
  const monthIdx = MONTH_INDEX[match[2]];
  const year = Number(match[3]);
  if (monthIdx === undefined) {
    throw new Error(`Could not parse date "${input}". Unknown month: ${match[2]}`);
  }
  return utcDate(year, monthIdx, day);
}

const PERIOD_RE = /^([A-Z][a-z]+) (\d{1,2}) [-–] ([A-Z][a-z]+) (\d{1,2})$/;

export function parsePeriod(input, endYearHint) {
  const match = PERIOD_RE.exec(input.trim());
  if (!match) {
    throw new Error(`Could not parse period "${input}". Expected format: "April 21 - May 20"`);
  }
  const [, startMonthName, startDay, endMonthName, endDay] = match;
  const startMonth = MONTH_INDEX[startMonthName];
  const endMonth = MONTH_INDEX[endMonthName];
  if (startMonth === undefined || endMonth === undefined) {
    throw new Error(`Could not parse period "${input}". Unknown month.`);
  }
  const endYear = endYearHint;
  const startYear = startMonth > endMonth ? endYear - 1 : endYear;
  return {
    start: utcDate(startYear, startMonth, Number(startDay)),
    end: utcDate(endYear, endMonth, Number(endDay)),
  };
}

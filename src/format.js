function roundHalfUp(value, decimals) {
  const absValue = Math.abs(value);
  const valStr = absValue.toString();
  if (valStr.includes('e')) {
    const factor = 10 ** decimals;
    return Math.sign(value) * Math.round(absValue * factor) / factor;
  }
  return Math.sign(value) * Number(Math.round(valStr + 'e' + decimals) + 'e-' + decimals);
}

export function formatAmount(value) {
  const rounded = roundHalfUp(value, 2);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded).toFixed(2);
  const [whole, fraction] = abs.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${withCommas}.${fraction}`;
}

export function formatRate(value) {
  const rounded = roundHalfUp(value, 3);
  let s = rounded.toFixed(3);
  s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

function roundHalfUp(value, decimals) {
  const factor = 10 ** decimals;
  return Math.sign(value) * Math.round(Math.abs(value) * factor) / factor;
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

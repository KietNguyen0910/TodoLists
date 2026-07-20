export function formatValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '_';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '_';
  return String(value);
}

export function formatPayroll(value) {
  return ['MYOB', 'Quickbook', 'Xero', 'Reckon'].includes(value) ? value : '_';
}

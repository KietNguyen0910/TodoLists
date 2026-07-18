export function getDateTime(value) {
  if (!value) return 0;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function formatDate(value, fallback = '_') {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-GB').format(date);
}

export function formatDateTime(value, fallback = '_') {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function getTodayInputDate() {
  return formatInputDate(new Date());
}

export function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createRange(from, to) {
  return { fromDate: formatInputDate(from), toDate: formatInputDate(to) };
}

export function getReportDatePresetRange(preset, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentMonthStart = new Date(year, month, 1);
  const currentQuarterStartMonth = Math.floor(month / 3) * 3;
  const currentQuarterStart = new Date(year, currentQuarterStartMonth, 1);
  const financialYearStartYear = month >= 6 ? year : year - 1;
  const financialYearStart = new Date(financialYearStartYear, 6, 1);

  switch (preset) {
    case 'this-month':
      return createRange(currentMonthStart, new Date(year, month + 1, 0));
    case 'this-quarter':
      return createRange(currentQuarterStart, new Date(year, currentQuarterStartMonth + 3, 0));
    case 'this-financial-year':
      return createRange(financialYearStart, new Date(financialYearStartYear + 1, 6, 0));
    case 'last-month':
      return createRange(new Date(year, month - 1, 1), new Date(year, month, 0));
    case 'last-quarter':
      return createRange(new Date(year, currentQuarterStartMonth - 3, 1), new Date(year, currentQuarterStartMonth, 0));
    case 'last-financial-year':
      return createRange(new Date(financialYearStartYear - 1, 6, 1), new Date(financialYearStartYear, 6, 0));
    case 'month-to-date':
      return createRange(currentMonthStart, today);
    case 'quarter-to-date':
      return createRange(currentQuarterStart, today);
    case 'year-to-date':
      return createRange(financialYearStart, today);
    default:
      return null;
  }
}

export function getInclusiveDateRange(fromDate, toDate) {
  if (!fromDate || !toDate) return null;

  const from = new Date(`${fromDate}T00:00:00.000`);
  const to = new Date(`${toDate}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;

  return { from: from.getTime(), to: to.getTime() };
}

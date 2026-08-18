export function getDateRangeAfterFromDateChange(fromDate, toDate) {
  const shouldClearToDate = Boolean(fromDate && toDate && fromDate > toDate);

  return {
    fromDate,
    toDate: shouldClearToDate ? '' : toDate,
    shouldOpenToDate: Boolean(fromDate),
  };
}

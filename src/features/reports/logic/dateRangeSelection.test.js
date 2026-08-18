import { getDateRangeAfterFromDateChange } from './dateRangeSelection';

describe('report date range selection', () => {
  it('opens the To date picker after a valid From date is selected', () => {
    expect(getDateRangeAfterFromDateChange('2026-07-01', '')).toEqual({
      fromDate: '2026-07-01',
      toDate: '',
      shouldOpenToDate: true,
    });
  });

  it('clears a To date earlier than the new From date', () => {
    expect(getDateRangeAfterFromDateChange('2026-08-01', '2026-07-31')).toEqual({
      fromDate: '2026-08-01',
      toDate: '',
      shouldOpenToDate: true,
    });
  });

  it('keeps a To date on or after the From date', () => {
    expect(getDateRangeAfterFromDateChange('2026-07-01', '2026-07-31')).toEqual({
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
      shouldOpenToDate: true,
    });
  });
});

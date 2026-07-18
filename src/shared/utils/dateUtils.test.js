import { getReportDatePresetRange } from './dateUtils';

describe('getReportDatePresetRange', () => {
  const today = new Date(2026, 6, 18);

  it.each([
    ['this-month', '2026-07-01', '2026-07-31'],
    ['this-quarter', '2026-07-01', '2026-09-30'],
    ['this-financial-year', '2026-07-01', '2027-06-30'],
    ['last-month', '2026-06-01', '2026-06-30'],
    ['last-quarter', '2026-04-01', '2026-06-30'],
    ['last-financial-year', '2025-07-01', '2026-06-30'],
    ['month-to-date', '2026-07-01', '2026-07-18'],
    ['quarter-to-date', '2026-07-01', '2026-07-18'],
    ['year-to-date', '2026-07-01', '2026-07-18'],
  ])('returns the expected range for %s', (preset, fromDate, toDate) => {
    expect(getReportDatePresetRange(preset, today)).toEqual({ fromDate, toDate });
  });

  it('uses the previous financial year before July', () => {
    expect(getReportDatePresetRange('year-to-date', new Date(2026, 2, 15))).toEqual({
      fromDate: '2025-07-01',
      toDate: '2026-03-15',
    });
  });

  it('returns null for the custom range', () => {
    expect(getReportDatePresetRange('custom', today)).toBeNull();
  });

  it('handles a last-quarter range that crosses a calendar year', () => {
    expect(getReportDatePresetRange('last-quarter', new Date(2026, 0, 12))).toEqual({
      fromDate: '2025-10-01',
      toDate: '2025-12-31',
    });
  });
});

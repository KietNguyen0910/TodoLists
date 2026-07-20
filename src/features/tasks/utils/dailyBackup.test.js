import { DAILY_BACKUP_STORAGE_KEY, getDailyBackupFilename, hasDailyBackup, markDailyBackup } from './dailyBackup';

describe('daily backup storage', () => {
  const backupDate = new Date(2026, 6, 20);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('marks one local backup for the current browser day', () => {
    expect(hasDailyBackup(backupDate)).toBe(false);

    markDailyBackup(backupDate);

    expect(window.localStorage.getItem(DAILY_BACKUP_STORAGE_KEY)).toBe('2026-07-20');
    expect(hasDailyBackup(backupDate)).toBe(true);
    expect(hasDailyBackup(new Date(2026, 6, 21))).toBe(false);
  });

  it('builds the requested Windows-safe backup filename', () => {
    expect(getDailyBackupFilename(backupDate)).toBe('Daily Outcome-Based Updates-as at 20-07-26 - Cassie.xlsx');
  });
});

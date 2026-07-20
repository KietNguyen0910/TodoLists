import { formatInputDate } from '../../../shared/utils/dateUtils';

export const DAILY_BACKUP_STORAGE_KEY = 'todoApp.dailyOutcomeBackupDate';

export function getDailyBackupDate(date = new Date()) {
  return formatInputDate(date);
}

export function hasDailyBackup(date = new Date()) {
  try {
    return window.localStorage.getItem(DAILY_BACKUP_STORAGE_KEY) === getDailyBackupDate(date);
  } catch {
    return false;
  }
}

export function markDailyBackup(date = new Date()) {
  try {
    window.localStorage.setItem(DAILY_BACKUP_STORAGE_KEY, getDailyBackupDate(date));
  } catch {
    // The export is still valid when browser storage is unavailable.
  }
}

export function getDailyBackupFilename(date = new Date()) {
  const [year, month, day] = getDailyBackupDate(date).split('-');
  return `Daily Outcome-Based Updates-as at ${day}-${month}-${year.slice(-2)} - Cassie.xlsx`;
}

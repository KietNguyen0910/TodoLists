export const NOTIFICATION_READ_KEY = 'todoApp.readWaitingNotifications';

export function loadReadNotificationIds() {
  try {
    const value = window.localStorage.getItem(NOTIFICATION_READ_KEY);
    const ids = JSON.parse(value || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function saveReadNotificationIds(ids) {
  window.localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(ids));
}

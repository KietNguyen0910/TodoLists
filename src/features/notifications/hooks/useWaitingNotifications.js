import { useState } from 'react';
import { getOverdueWaitingNotifications } from '../logic/waitingNotifications';
import { loadReadNotificationIds, saveReadNotificationIds } from '../utils/notificationStorage';

export function useWaitingNotifications(tasks) {
  const [readNotificationIds, setReadNotificationIds] = useState(loadReadNotificationIds);
  const notifications = getOverdueWaitingNotifications(tasks);
  const unreadCount = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length;

  const markNotificationsRead = () => {
    if (notifications.length === 0) return;

    setReadNotificationIds((currentIds) => {
      const nextIds = Array.from(new Set([...currentIds, ...notifications.map((notification) => notification.id)]));
      saveReadNotificationIds(nextIds);
      return nextIds;
    });
  };

  return { notifications, unreadCount, markNotificationsRead };
}

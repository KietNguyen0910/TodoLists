import { WAITING_STATUSES } from '../../../app/tabs.config';
import { getDateTime } from '../../../shared/utils/dateUtils';
import { isActiveTask } from '../../tasks/logic/taskFilters';

const OVERDUE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isWaitingStatus(status) {
  return WAITING_STATUSES.has(status);
}

export function getWaitingEnteredAt(task) {
  const history = Array.isArray(task.statusHistory) ? task.statusHistory : [];
  let enteredAt = null;
  let wasWaiting = false;

  history.forEach((entry) => {
    const isWaiting = isWaitingStatus(entry.status);
    if (isWaiting && !wasWaiting) {
      enteredAt = entry.changedAt;
    }
    wasWaiting = isWaiting;
  });

  return enteredAt || task.updatedAt || task.createdAt || task.assignDate;
}

export function getNotificationId(task, waitingEnteredAt) {
  return `${task._id}:${waitingEnteredAt || 'unknown'}`;
}

export function getOverdueWaitingNotifications(tasks) {
  const now = Date.now();

  return tasks
    .filter(isActiveTask)
    .filter((task) => isWaitingStatus(task.status))
    .map((task) => {
      const waitingEnteredAt = getWaitingEnteredAt(task);
      const waitingTime = getDateTime(waitingEnteredAt);
      const daysWaiting = waitingTime ? Math.floor((now - waitingTime) / DAY_MS) : 0;

      return {
        id: getNotificationId(task, waitingEnteredAt),
        task,
        waitingEnteredAt,
        daysWaiting,
      };
    })
    .filter((notification) => notification.daysWaiting >= OVERDUE_DAYS)
    .sort((first, second) => second.daysWaiting - first.daysWaiting);
}

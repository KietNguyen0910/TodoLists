import { getDateTime } from '../../../shared/utils/dateUtils';

export function sortTasksForTab(tasks, tabId) {
  if (!['waiting', 'completed'].includes(tabId)) return tasks;

  return [...tasks].sort((first, second) => getDateTime(second.assignDate) - getDateTime(first.assignDate));
}

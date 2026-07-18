import { getDateTime } from '../../../shared/utils/dateUtils';

export const TASK_SORT_MODES = {
  STATUS: 'status',
  DATE_DESC: 'date-desc',
  DATE_ASC: 'date-asc',
  CLIENT: 'client',
  TASK: 'task',
};

const STATUS_PRIORITY = [
  'In Progress',
  'Initial Information Received',
  'Sent Report to client',
  'On hold',
  'Waiting for review',
  'Waiting client',
  'Sent query for Manager',
  'Lodged/Completed',
];

const STATUS_RANK = new Map(STATUS_PRIORITY.map((status, index) => [status, index]));

const compareText = (first, second) => String(first || '').localeCompare(String(second || ''), undefined, { sensitivity: 'base' });

function getCompletionDateTime(task) {
  const completionHistoryDate = (Array.isArray(task.statusHistory) ? task.statusHistory : [])
    .filter((entry) => entry.status === 'Lodged/Completed')
    .reduce((latest, entry) => Math.max(latest, getDateTime(entry.changedAt)), 0);

  return Math.max(getDateTime(task.completionDate), completionHistoryDate);
}

function getTaskDateTime(task, tabId) {
  return tabId === 'completed'
    ? getCompletionDateTime(task)
    : getDateTime(task.assignDate);
}

export function getDefaultTaskSortMode(tabId) {
  return tabId === 'completed' ? TASK_SORT_MODES.DATE_DESC : TASK_SORT_MODES.STATUS;
}

export function sortTasksForTab(tasks, tabId, sortMode = getDefaultTaskSortMode(tabId)) {
  return [...tasks].sort((first, second) => {
    const firstDate = getTaskDateTime(first, tabId);
    const secondDate = getTaskDateTime(second, tabId);

    switch (sortMode) {
      case TASK_SORT_MODES.DATE_ASC:
        return firstDate - secondDate;
      case TASK_SORT_MODES.DATE_DESC:
        return secondDate - firstDate;
      case TASK_SORT_MODES.CLIENT:
        return compareText(first.title, second.title) || secondDate - firstDate;
      case TASK_SORT_MODES.TASK:
        return compareText(first.description, second.description) || secondDate - firstDate;
      case TASK_SORT_MODES.STATUS:
      default: {
        const firstRank = STATUS_RANK.get(first.status) ?? STATUS_PRIORITY.length;
        const secondRank = STATUS_RANK.get(second.status) ?? STATUS_PRIORITY.length;
        return firstRank - secondRank || firstDate - secondDate;
      }
    }
  });
}

import { TASK_TABS } from '../../../app/tabs.config';

export function isActiveTask(task) {
  return !(task.deleted || task.isDeleted);
}

export function getTaskTabId(status) {
  return TASK_TABS.find((tab) => tab.statuses.includes(status))?.id || null;
}

export function getTasksForTab(tasks, tab) {
  return tasks.filter(isActiveTask).filter((task) => tab.statuses.includes(task.status));
}

export function getSearchableTasks(tasks) {
  return tasks.filter(isActiveTask).filter((task) => getTaskTabId(task.status));
}

export function getTaskCountForTab(tasks, tab) {
  return getTasksForTab(tasks, tab).length;
}

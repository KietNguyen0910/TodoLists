const IN_PROGRESS_STATUS = 'In Progress';
const INITIAL_STATUS = 'Initial Information Received';
const IN_PROGRESS_CAPACITY = 4;

function isActiveTask(task) {
  return !(task?.deleted || task?.isDeleted);
}

function getValidAssignDateTime(task) {
  if (!task?.assignDate) return null;

  const value = String(task.assignDate).trim();
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!isoMatch && !displayMatch) return null;

  const [, year, month, day] = isoMatch || ['', displayMatch[3], displayMatch[2], displayMatch[1]];
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
  ) return null;

  return date.getTime();
}

function getCreatedDateTime(task) {
  const date = new Date(task?.createdAt || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function compareInitialTasks(first, second) {
  const firstAssignDate = getValidAssignDateTime(first);
  const secondAssignDate = getValidAssignDateTime(second);

  if (firstAssignDate !== null && secondAssignDate !== null) {
    return firstAssignDate - secondAssignDate || getCreatedDateTime(first) - getCreatedDateTime(second);
  }
  if (firstAssignDate !== null) return -1;
  if (secondAssignDate !== null) return 1;

  return getCreatedDateTime(first) - getCreatedDateTime(second);
}

function selectAutomaticAssignments(tasks, capacity = IN_PROGRESS_CAPACITY) {
  const activeTasks = tasks.filter(isActiveTask);
  const availableSlots = Math.max(0, capacity - activeTasks.filter((task) => task.status === IN_PROGRESS_STATUS).length);
  if (availableSlots === 0) return [];

  return activeTasks
    .filter((task) => task.status === INITIAL_STATUS)
    .sort(compareInitialTasks)
    .slice(0, availableSlots);
}

function createAutoAssignLog(task, changedAt = new Date()) {
  return {
    action: 'auto-assigned',
    actor: 'Automatic assignment',
    changedAt,
    changes: [{
      field: 'status',
      label: 'Status',
      from: task.status,
      to: IN_PROGRESS_STATUS,
    }],
  };
}

module.exports = {
  IN_PROGRESS_STATUS,
  INITIAL_STATUS,
  IN_PROGRESS_CAPACITY,
  selectAutomaticAssignments,
  createAutoAssignLog,
};

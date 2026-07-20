function hasText(value) {
  return Boolean(String(value || '').trim());
}

function hasItems(value) {
  return Array.isArray(value) ? value.length > 0 : hasText(value);
}

const COLUMN_DATA_CHECKS = [
  ['is-assign-date-empty', (task) => hasText(task.assignDate)],
  ['is-software-empty', (task) => hasText(task.software)],
  ['is-client-empty', (task) => hasText(task.title)],
  ['is-task-empty', (task) => hasText(task.description)],
  ['is-payroll-empty', (task) => task.payroll !== null && task.payroll !== undefined],
  ['is-property-empty', (task) => hasItems(task.properties)],
  ['is-motor-vehicle-empty', (task) => hasItems(task.motorVehicles)],
  ['is-outcome-empty', (task) => hasItems(task.outcomeAchieved)],
  ['is-note-empty', (task) => hasText(task.notes)],
];

export function getEmptyTaskTableColumnClasses(tasks, showCompletionTime = false) {
  const emptyClasses = COLUMN_DATA_CHECKS
    .filter(([, hasData]) => !tasks.some(hasData))
    .map(([className]) => className);

  if (showCompletionTime && !tasks.some((task) => task.completionDate)) {
    emptyClasses.push('is-completion-date-empty');
  }

  return emptyClasses.join(' ');
}

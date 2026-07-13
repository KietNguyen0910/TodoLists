import { exportReportRows } from '../../reports/logic/reportExport';

function getExportDate(task) {
  return task.updatedAt || task.createdAt || task.assignDate || new Date().toISOString();
}

function getSafeFilenamePart(value) {
  return String(value || 'task')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'task';
}

export function exportTask(task) {
  const exportDate = getExportDate(task);
  const client = task.title || '_';
  const taskName = task.description || '_';

  exportReportRows([
    {
      id: task._id || `${client}-${taskName}`,
      activityDate: exportDate,
      client,
      taskName,
      software: task.software || '_',
      currentStatus: task.status || '_',
      action: 'Current task',
      updatedFields: '_',
      detail: task.notes || '_',
    },
  ], 'jobs', 'task', 'task', `task-${getSafeFilenamePart(client)}-${getSafeFilenamePart(taskName)}.xlsx`);
}

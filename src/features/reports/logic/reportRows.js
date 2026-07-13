import { getDateTime, getInclusiveDateRange } from '../../../shared/utils/dateUtils';
import { ACTION_LABELS, formatDetail, formatLogDetail, getUpdatedFields } from '../utils/reportFormatters';

export function getLogsInRange(task, range) {
  return (Array.isArray(task.auditLogs) ? task.auditLogs : [])
    .filter((log) => {
      const changedAt = getDateTime(log.changedAt);
      return changedAt >= range.from && changedAt <= range.to;
    })
    .sort((first, second) => getDateTime(second.changedAt) - getDateTime(first.changedAt));
}

export function buildActivityRows(tasks, fromDate, toDate) {
  const range = getInclusiveDateRange(fromDate, toDate);
  if (!range) return [];

  return tasks
    .flatMap((task) => getLogsInRange(task, range).map((log, logIndex) => {
      const changedAt = getDateTime(log.changedAt);

      return {
        id: `${task._id}-${log.changedAt}-${log.action}-${logIndex}`,
        changedAt,
        activityDate: log.changedAt,
        client: task.title || '_',
        taskName: task.description || '_',
        software: task.software || '_',
        currentStatus: task.status || '_',
        action: ACTION_LABELS[log.action] || log.action || '_',
        updatedFields: getUpdatedFields(log.changes),
        detail: formatDetail(log.changes),
      };
    }))
    .sort((first, second) => second.changedAt - first.changedAt);
}

export function buildJobRows(tasks, fromDate, toDate) {
  const range = getInclusiveDateRange(fromDate, toDate);
  if (!range) return [];

  return tasks
    .map((task) => {
      const matchingLogs = getLogsInRange(task, range);
      if (!matchingLogs.length) return null;

      const latestLog = matchingLogs[0];
      const changedAt = getDateTime(latestLog.changedAt);
      const actions = Array.from(new Set(matchingLogs.map((log) => ACTION_LABELS[log.action] || log.action).filter(Boolean)));
      const updatedFields = Array.from(new Set(
        matchingLogs.flatMap((log) => (Array.isArray(log.changes) ? log.changes : []).map((change) => change.label || change.field).filter(Boolean))
      ));

      return {
        id: task._id,
        changedAt,
        activityDate: latestLog.changedAt,
        client: task.title || '_',
        taskName: task.description || '_',
        software: task.software || '_',
        currentStatus: task.status || '_',
        action: actions.length ? actions.join(', ') : '_',
        updatedFields: updatedFields.length ? updatedFields.join(', ') : '_',
        detail: matchingLogs.map(formatLogDetail).join('\n\n'),
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.changedAt - first.changedAt);
}

export function buildSearchRows(tasks) {
  return tasks
    .filter((task) => !(task.deleted || task.isDeleted))
    .map((task) => {
      const activityDate = task.updatedAt || task.createdAt || task.assignDate || null;

      return {
        id: task._id,
        changedAt: getDateTime(activityDate),
        activityDate,
        client: task.title || '_',
        taskName: task.description || '_',
        software: task.software || '_',
        currentStatus: task.status || '_',
        action: 'Current task',
        updatedFields: '_',
        detail: task.notes || '_',
      };
    })
    .sort((first, second) => second.changedAt - first.changedAt);
}

export function filterRowsByClient(rows, clientSearch) {
  const keyword = clientSearch.trim().toLowerCase();
  if (!keyword) return rows;

  return rows.filter((row) => row.client.toLowerCase().includes(keyword));
}

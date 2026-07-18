import { formatDateTime } from '../../../shared/utils/dateUtils';
import { getStatusLabel } from '../../../shared/config/statusConfig';
import { formatValue } from '../../../shared/utils/valueFormatters';

export const ACTION_LABELS = {
  created: 'Created Task',
  updated: 'Updated Task',
  deleted: 'Deleted Task',
  'auto-assigned': 'Auto assigned',
};

export const REPORT_TYPES = {
  activities: 'Activities',
  jobs: 'Jobs',
};

export function formatDetail(changes = []) {
  if (!changes.length) return '_';

  return changes
    .map((change) => {
      const formatChangeValue = (value) => (change.field === 'status' ? getStatusLabel(value) : formatValue(value));
      return `${change.label || change.field}: ${formatChangeValue(change.from)} -> ${formatChangeValue(change.to)}`;
    })
    .join('\n');
}

export function formatLogDetail(log) {
  const action = ACTION_LABELS[log.action] || log.action || 'Activity';
  return `${formatDateTime(log.changedAt)} - ${action}\n${formatDetail(log.changes)}`;
}

export function getUpdatedFields(changes = []) {
  if (!changes.length) return '_';

  return changes.map((change) => change.label || change.field).filter(Boolean).join(', ');
}

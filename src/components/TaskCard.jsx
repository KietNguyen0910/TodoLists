function hexToRgba(hex, alpha = 0.12) {
  const normalized = hex.replace('#', '').length === 3
    ? hex.replace('#', '').split('').map((char) => char + char).join('')
    : hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);

  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function formatDate(dateString) {
  if (!dateString) return 'No date';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-GB').format(date);
}

function formatDateTime(dateString) {
  if (!dateString) return '_';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '_';

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function TaskCard({ index, task, statusMap, onStatusChange, onDelete, onEdit, onViewHistory, showCompletionTime = false, isStatusUpdating = false }) {
  const statusConfig = statusMap[task.status] || statusMap['Initial Information Received'];
  const outcomes = Array.isArray(task.outcomeAchieved)
    ? task.outcomeAchieved
    : task.outcomeAchieved ? [task.outcomeAchieved] : [];

  return (
    <tr className="task-row" style={{ backgroundColor: hexToRgba(statusConfig.color || '#ffffff', 0.6) }}>
      <td>{index}</td>
      <td>{formatDate(task.assignDate)}</td>
      <td>{task.software || '_'}</td>
      <td>{task.title || '_'}</td>
      <td>{task.description || '_'}</td>
      <td>{outcomes.length ? <ul className="outcome-table-list">{outcomes.map((outcome) => <li key={outcome}>+ {outcome}</li>)}</ul> : '_'}</td>
      <td>{task.notes || '_'}</td>
      {showCompletionTime && <td className="completion-time-cell">{formatDateTime(task.completionDate)}</td>}
      <td className="task-status-column">
        <div className="task-status-cell">
          <select
            className="font-semibold status-tag"
            value={task.status}
            aria-label={`Status for ${task.title || 'task'}`}
            disabled={isStatusUpdating}
            onChange={(event) => onStatusChange(task._id, event.target.value)}
            style={{
              background: statusConfig.color,
              borderColor: task.status === 'Lodged/Completed' ? '#f0f0f0' : statusConfig.color,
              color: task.status === 'Lodged/Completed' ? '#000' : '#fff',
            }}
          >
            {Object.entries(statusMap).map(([statusKey, config]) => (
              <option key={statusKey} value={statusKey} style={{ background: '#fff', color: '#0f172a' }}>
                {config.label}
              </option>
            ))}
          </select>
          {isStatusUpdating && <span className="status-loading"><span className="loading-spinner" aria-hidden="true" />Updating...</span>}
          <div className="task-edit">
            <button className="delete-button" type="button" aria-label={`View history for ${task.title || 'task'}`} onClick={() => onViewHistory(task)}>&#128065;</button>
            <button className="delete-button" type="button" aria-label={`Edit ${task.title || 'task'}`} onClick={() => onEdit(task)}>✎</button>
            <button className="delete-button" type="button" aria-label={`Delete ${task.title || 'task'}`} onClick={() => onDelete(task._id, task.title)}>×</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

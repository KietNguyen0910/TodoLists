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

export default function TaskCard({ index, task, taskRef, statusMap, onStatusChange, onDelete, onEdit, onViewHistory, showCompletionTime = false, isStatusUpdating = false, isHighlighted = false }) {
  const statusConfig = statusMap[task.status] || statusMap['Initial Information Received'];
  const outcomes = Array.isArray(task.outcomeAchieved)
    ? task.outcomeAchieved
    : task.outcomeAchieved ? [task.outcomeAchieved] : [];
  const handleRowDoubleClick = (event) => {
    if (event.target.closest('button, select, input, textarea, a')) return;
    onEdit(task);
  };

  return (
    <tr ref={taskRef} className={`task-row ${isHighlighted ? 'is-highlighted' : ''}`} onDoubleClick={handleRowDoubleClick} style={{ backgroundColor: hexToRgba(statusConfig.color || '#ffffff', 0.6) }}>
      <td className='cursor-pointer'>{index}</td>
      <td className='cursor-pointer'>{formatDate(task.assignDate)}</td>
      <td className='cursor-pointer'>{task.software || '_'}</td>
      <td className='cursor-pointer'>{task.title || '_'}</td>
      <td className='cursor-pointer'>{task.description || '_'}</td>
      <td className='cursor-pointer'>{outcomes.length ? <ul className="outcome-table-list">{outcomes.map((outcome) => <li key={outcome}>+ {outcome}</li>)}</ul> : '_'}</td>
      <td className='cursor-pointer'>{task.notes || '_'}</td>
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

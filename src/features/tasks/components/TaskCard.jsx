import { getOutcomeProgress } from '../../outcomes/logic/outcomeProgress';
import { getSoftwareColor } from '../../../shared/config/softwareConfig';
import { isInteractiveElement } from '../../../shared/utils/domUtils';
import { formatDateTime, formatPayroll, formatTaskDate, hexToRgba } from '../utils/taskFormatters';

export default function TaskCard({
  index,
  task,
  taskRef,
  isSelected = false,
  onSelect,
  statusMap,
  onStatusChange,
  onDelete,
  onEdit,
  onViewHistory,
  onRequireLogin,
  showCompletionTime = false,
  hideEmptyOutcomeProgress = false,
  isStatusUpdating = false,
  isHighlighted = false,
  isReadOnly = false,
}) {
  const statusConfig = statusMap[task.status] || statusMap['Initial Information Received'];
  const outcomes = Array.isArray(task.outcomeAchieved)
    ? task.outcomeAchieved
    : task.outcomeAchieved ? [task.outcomeAchieved] : [];
  const outcomeProgress = getOutcomeProgress(outcomes);
  const properties = Array.isArray(task.properties) ? task.properties : [];
  const motorVehicles = Array.isArray(task.motorVehicles) ? task.motorVehicles : [];
  const handleProtectedAction = (action, callback) => {
    if (isReadOnly) {
      onRequireLogin?.(action);
      return;
    }

    callback();
  };
  const handleRowDoubleClick = (event) => {
    if (isInteractiveElement(event.target)) return;
    handleProtectedAction('edit tasks', () => onEdit(task));
  };
  const handleStatusMouseDown = (event) => {
    if (!isReadOnly) return;

    event.preventDefault();
    onRequireLogin?.('change task status');
  };
  const handleStatusKeyDown = (event) => {
    if (!isReadOnly || !['Enter', ' '].includes(event.key)) return;

    event.preventDefault();
    onRequireLogin?.('change task status');
  };

  return (
    <tr ref={taskRef} className={`task-row ${isHighlighted ? 'is-highlighted' : ''}`} onDoubleClick={handleRowDoubleClick} style={{ backgroundColor: hexToRgba(statusConfig.color || '#ffffff', 0.3) }}>
      <td className="task-select-cell">
        <input
          type="checkbox"
          checked={isSelected}
          aria-label={`Select ${task.title || 'task'}`}
          onChange={() => onSelect?.(task._id)}
        />
      </td>
      <td className="cursor-pointer">{index}</td>
      <td className="cursor-pointer">{formatTaskDate(task.assignDate)}</td>
      <td className="cursor-pointer">{task.software ? <span className="software-value" style={{ color: getSoftwareColor(task.software) }}>{task.software}</span> : '_'}</td>
      <td className="cursor-pointer">{task.title || '_'}</td>
      <td className="cursor-pointer">{task.description || '_'}</td>
      <td className="cursor-pointer">{outcomes.length ? <>{!(hideEmptyOutcomeProgress && outcomeProgress.completedPhases === 0) && <div className="outcome-progress-label">{outcomeProgress.label}</div>}<ul className="outcome-table-list">{outcomes.map((outcome) => <li key={outcome}>+ {outcome}</li>)}</ul></> : '_'}</td>
      <td className="cursor-pointer">{task.notes || '_'}</td>
      <td className="cursor-pointer payroll-cell">{formatPayroll(task.payroll)}</td>
      <td className="cursor-pointer property-cell">{properties.length ? properties.map((property, propertyIndex) => <span className="property-table-value" key={`${property.address}-${propertyIndex}`}>{property.address} <em>{property.type === 'Investment' ? 'Investment' : 'Primary'}</em></span>) : '_'}</td>
      <td className="cursor-pointer motor-vehicle-cell">{motorVehicles.length ? motorVehicles.map((vehicle) => <span className="motor-vehicle-table-tag" key={vehicle}>{vehicle}</span>) : '_'}</td>
      {showCompletionTime && <td className="completion-time-cell">{formatDateTime(task.completionDate)}</td>}
      <td className="task-status-column">
        <div className="task-status-cell">
          <select
            className="font-semibold status-tag"
            value={task.status}
            aria-label={`Status for ${task.title || 'task'}`}
            aria-disabled={isReadOnly}
            disabled={isStatusUpdating}
            onMouseDown={handleStatusMouseDown}
            onKeyDown={handleStatusKeyDown}
            onChange={(event) => handleProtectedAction('change task status', () => onStatusChange(task._id, event.target.value))}
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
            <button className="delete-button" type="button" aria-disabled={isReadOnly} aria-label={`Edit ${task.title || 'task'}`} onClick={() => handleProtectedAction('edit tasks', () => onEdit(task))}>&#9998;</button>
            <button className="delete-button" type="button" aria-disabled={isReadOnly} aria-label={`Delete ${task.title || 'task'}`} onClick={() => handleProtectedAction('delete tasks', () => onDelete(task._id, task.title))}>&times;</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

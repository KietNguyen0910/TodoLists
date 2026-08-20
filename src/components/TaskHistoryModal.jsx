const ACTION_LABELS = {
  created: 'Created Task',
  updated: 'Updated Task',
  deleted: 'Deleted Task',
  'auto-assigned': 'Auto assigned',
};

function formatDateTime(dateString) {
  if (!dateString) return '_';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '_';

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatValue(value) {
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : '_';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '_';
  if (typeof value === 'object' && value.address) return `${value.address} (${value.type === 'Investment' ? 'Investment' : 'Primary'})`;
  return String(value);
}

function getChangeLabels(changes = []) {
  return changes.map((change) => change.label || change.field).filter(Boolean).join(', ');
}

export function getHistoryLogTitle(log) {
  const changeLabels = getChangeLabels(log?.changes);
  return `${ACTION_LABELS[log?.action] || 'Updated task'}${changeLabels ? ` (${changeLabels})` : ''}`;
}

function isDeletedAuditLog(log) {
  if (log.action === 'deleted') return true;

  return (Array.isArray(log.changes) ? log.changes : []).some((change) => (
    ['deleted', 'isDeleted'].includes(change.field) && Boolean(change.to ?? change.next)
  ));
}

export function getVisibleHistoryLogs(auditLogs) {
  return (Array.isArray(auditLogs) ? auditLogs : [])
    .filter((log) => !isDeletedAuditLog(log))
    .sort((left, right) => new Date(right.changedAt) - new Date(left.changedAt));
}

export default function TaskHistoryModal({ isOpen, task, onClose, onAddToNote }) {
  if (!isOpen) return null;

  const logs = getVisibleHistoryLogs(task?.auditLogs);
  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={handleOverlayClick}>
      <div className="modal-card history-modal-card" role="dialog" aria-modal="true" aria-labelledby="task-history-title">
        <div className="modal-header">
          <h2 id="task-history-title">Task History</h2>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>x</button>
        </div>
        <div className="modal-content history-modal-content">
          <div className="task-title-display history-task-title">
            <strong>{task?.title || '_'}</strong>
            {task?.description && <span>{task.description}</span>}
          </div>
          {logs.length === 0 ? (
            <p className="empty">No history yet.</p>
          ) : (
            <ol className="history-timeline">
              {logs.map((log, index) => (
                <li className="history-item" key={`${log.changedAt}-${log.action}-${index}`}>
                  <details className="history-details">
                    <summary
                      className="history-summary history-note-action"
                      title="Double-click to add this title to Note"
                      aria-keyshortcuts="Alt+Enter"
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        onAddToNote?.(task, getHistoryLogTitle(log));
                      }}
                      onKeyDown={(event) => {
                        if (event.altKey && event.key === 'Enter') {
                          event.preventDefault();
                          onAddToNote?.(task, getHistoryLogTitle(log));
                        }
                      }}
                    >
                      <span className="history-summary-title">
                        {getHistoryLogTitle(log)}
                      </span>
                      <span className="history-summary-meta">{formatDateTime(log.changedAt)}</span>
                    </summary>
                    <div className="history-detail-body">
                      <p className="history-actor">By {log.actor || 'User'}</p>
                      {log.changes?.length > 0 && (
                        <ul className="history-changes">
                          {log.changes.map((change, changeIndex) => (
                            <li key={`${change.field}-${changeIndex}`}>
                              <span>{change.label || change.field}</span>
                              <strong>{formatValue(change.from)} -&gt; {formatValue(change.to)}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

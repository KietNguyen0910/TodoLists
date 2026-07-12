export default function DeleteConfirmModal({ isOpen, taskTitle, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-task-title">
        <div className="modal-header">
          <h2 id="delete-task-title">Delete Task</h2>
          <button className="modal-close" type="button" aria-label="Close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <p>Are you sure you want to delete this task?</p>
          {taskTitle && <p className="task-title-display"><strong>{taskTitle}</strong></p>}
        </div>
        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

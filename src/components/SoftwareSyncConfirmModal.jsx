export default function SoftwareSyncConfirmModal({ isOpen, clientName, fields, taskCount, onConfirm, onCancel, isSubmitting = false }) {
  if (!isOpen) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) onCancel();
  };

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={handleOverlayClick}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="software-sync-title">
        <div className="modal-header">
          <h2 id="software-sync-title">Sync Client Details</h2>
          <button className="modal-close" type="button" aria-label="Close" disabled={isSubmitting} onClick={onCancel}>&times;</button>
        </div>
        <div className="modal-content">
          <p><strong>{clientName}</strong> has {taskCount} other task{taskCount === 1 ? '' : 's'} that will be updated.</p>
          <p>The following fields will be copied to every active task of this client: <strong>{fields.join(', ')}</strong>.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="button-secondary" disabled={isSubmitting} onClick={onCancel}>Cancel</button>
          <button type="button" className="button-primary button-loading" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting && <span className="loading-spinner" aria-hidden="true" />}
            {isSubmitting ? 'Updating...' : 'Confirm and Sync'}
          </button>
        </div>
      </div>
    </div>
  );
}

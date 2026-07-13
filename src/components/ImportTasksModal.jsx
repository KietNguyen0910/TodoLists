import { useRef, useState } from 'react';

function PreviewList({ title, rows, className }) {
  if (!rows.length) return null;

  return (
    <div className={className}>
      <h3>{title} ({rows.length})</h3>
      <ul>
        {rows.slice(0, 5).map((row, index) => <li key={`${row.source}-${index}`}><strong>{row.source}</strong>: {row.reason}</li>)}
      </ul>
      {rows.length > 5 && <p>...and {rows.length - 5} more.</p>}
    </div>
  );
}

export default function ImportTasksModal({ isOpen, preview, onClose, onConfirm, onFileSelected, onDownloadTemplate, isImporting }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  if (!isOpen) return null;

  const handleFile = (file) => {
    if (file && !isImporting) onFileSelected(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  if (!preview) {
    return (
      <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <div className="modal-card import-modal" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
          <div className="modal-header">
            <h2 id="import-modal-title">Import tasks from Excel</h2>
            <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>&times;</button>
          </div>
          <div className="import-intro">
            <p>Upload a Job News Excel file to create tasks automatically. We read the active sheet only, then let you review the items before importing.</p>
            <p>Do not have a file yet? <button className="button-link" type="button" onClick={onDownloadTemplate}>Download the Job News template</button>.</p>
          </div>
          <input ref={inputRef} className="visually-hidden" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ''; }} />
          <button
            className={`import-dropzone${isDragging ? ' is-dragging' : ''}`}
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <span className="import-dropzone-icon" aria-hidden="true">&#8682;</span>
            <strong>Drag and drop your Excel file here</strong>
            <span>or click to choose a file</span>
          </button>
        </div>
      </div>
    );
  }

  const skippedRows = [...preview.duplicateRows, ...preview.existingDuplicates];
  const canConfirm = preview.tasks.length > 0 && !isImporting;

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isImporting) onClose(); }}>
      <div className="modal-card import-modal" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
        <div className="modal-header">
          <h2 id="import-modal-title">Review Excel import</h2>
          <button className="modal-close" type="button" aria-label="Close" disabled={isImporting} onClick={onClose}>&times;</button>
        </div>
        <p className="import-file-name">{preview.fileName}</p>
        {preview.sheetNames?.length > 0 && <p className="import-sheet-name">Sheet: {preview.sheetNames.join(', ')}</p>}
        <div className="import-summary" aria-label="Import summary">
          <div><strong>{preview.tasks.length}</strong><span>ready to create</span></div>
          <div><strong>{skippedRows.length}</strong><span>duplicates skipped</span></div>
          <div><strong>{preview.invalidRows.length}</strong><span>invalid rows</span></div>
        </div>
        {preview.tasks.length === 0 && <p className="error">There are no new valid tasks to import.</p>}
        <PreviewList title="Duplicates" rows={skippedRows} className="import-preview-list" />
        <PreviewList title="Invalid rows" rows={preview.invalidRows} className="import-preview-list import-preview-errors" />
        <div className="modal-actions">
          <button className="button-secondary" type="button" disabled={isImporting} onClick={onClose}>Cancel</button>
          <button className="button-primary button-loading" type="button" disabled={!canConfirm} onClick={onConfirm}>
            {isImporting && <span className="loading-spinner" aria-hidden="true" />}
            {isImporting ? 'Importing...' : `Import ${preview.tasks.length} task${preview.tasks.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const LEGACY_STATUS_VALUES = new Set(['Waiting for review']);

export function shouldOpenStatusPickerAbove(triggerRect, containerRect, menuHeight) {
  const spaceBelow = containerRect.bottom - triggerRect.bottom;
  const spaceAbove = triggerRect.top - containerRect.top;
  return spaceBelow < menuHeight && spaceAbove > spaceBelow;
}

export default function StatusPicker({ task, statusMap, onChange, onRequireLogin, isReadOnly = false, isUpdating = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState('bottom');
  const pickerRef = useRef(null);
  const menuRef = useRef(null);
  const statusConfig = statusMap[task.status] || statusMap['Initial Information Received'];
  const options = Object.entries(statusMap).filter(([status]) => !LEGACY_STATUS_VALUES.has(status));

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !pickerRef.current || !menuRef.current) return;

    const triggerRect = pickerRef.current.getBoundingClientRect();
    const container = pickerRef.current.closest('.task-list');
    const containerRect = container?.getBoundingClientRect() || {
      top: 0,
      bottom: window.innerHeight,
    };
    const nextPlacement = shouldOpenStatusPickerAbove(triggerRect, containerRect, menuRef.current.offsetHeight)
      ? 'top'
      : 'bottom';
    setMenuPlacement(nextPlacement);
  }, [isOpen]);

  const openPicker = () => {
    if (isReadOnly) {
      onRequireLogin?.('change task status');
      return;
    }
    if (!isUpdating) setIsOpen((current) => !current);
  };

  const selectStatus = (status) => {
    setIsOpen(false);
    if (status !== task.status) onChange(task._id, status);
  };

  return (
    <div className="status-picker" ref={pickerRef}>
      <button
        className="status-picker-trigger items-center"
        type="button"
        aria-label={`Status for ${task.title || 'task'}: ${statusConfig.label}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isUpdating}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
          if (isReadOnly && ['Enter', ' '].includes(event.key)) event.preventDefault();
        }}
        style={{
          background: statusConfig.color,
          borderColor: task.status === 'Lodged/Completed' ? '#e2e8f0' : statusConfig.color,
          color: task.status === 'Lodged/Completed' ? '#0f172a' : '#fff',
        }}
      >
        <span>{statusConfig.label}</span>
        <span className="status-picker-chevron -mt-4" aria-hidden="true">⌄</span>
      </button>
      {isOpen && (
        <div ref={menuRef} className={`status-picker-menu ${menuPlacement === 'top' ? 'is-above' : ''}`} role="menu" aria-label="Select status">
          <p className="status-picker-title">Update status</p>
          {options.map(([status, config]) => (
            <button
              key={status}
              className={`status-picker-option ${status === task.status ? 'is-selected' : ''}`}
              type="button"
              role="menuitemradio"
              aria-checked={status === task.status}
              onClick={() => selectStatus(status)}
            >
              <span className="status-picker-dot" style={{ background: config.color }} aria-hidden="true" />
              <span>{config.label}</span>
              {status === task.status && <span className="status-picker-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

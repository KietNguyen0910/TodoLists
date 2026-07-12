import React from 'react';

export default function StatusFilter({ statusMap, activeStatus, onSelectStatus }) {
  return (
    <div className="status-filter">
      <button
        type="button"
        className={`status-filter-button ${activeStatus === 'All' ? 'active' : ''}`}
        style={{ background: activeStatus === 'All' ? '#4f46e5' : '#f8fafc', color: activeStatus === 'All' ? '#ffffff' : '#0f172a' }}
        onClick={() => onSelectStatus('All')}
      >
        All
      </button>
      {Object.entries(statusMap).map(([key, config]) => (
        <button
          key={key}
          type="button"
          className={`status-filter-button ${activeStatus === key ? 'active' : ''}`}
          style={{ background: activeStatus === key ? config.color : '#f8fafc', color: activeStatus === key ? '#ffffff' : '#0f172a' }}
          onClick={() => onSelectStatus(key)}
        >
          {config.label}
        </button>
      ))}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import DatePickerInput from '../shared/components/DatePickerInput';
import ClientSearch from '../features/reports/components/ClientSearch';
import { exportReportRows } from '../features/reports/logic/reportExport';
import { buildActivityRows, buildJobRows, buildSearchRows, filterRowsByClient } from '../features/reports/logic/reportRows';
import { formatDateTime, getInclusiveDateRange, getReportDatePresetRange } from '../shared/utils/dateUtils';

const DATE_RANGE_PRESETS = [
  { value: 'this-month', label: 'This month', group: 'current' },
  { value: 'this-quarter', label: 'This quarter', group: 'current' },
  { value: 'this-financial-year', label: 'This financial year', group: 'current' },
  { value: 'last-month', label: 'Last month', group: 'previous' },
  { value: 'last-quarter', label: 'Last quarter', group: 'previous' },
  { value: 'last-financial-year', label: 'Last financial year', group: 'previous' },
  { value: 'month-to-date', label: 'Month to date', group: 'to-date' },
  { value: 'quarter-to-date', label: 'Quarter to date', group: 'to-date' },
  { value: 'year-to-date', label: 'Year to date', group: 'to-date' },
];

const dateRangeLabelFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatDateRangeLabel(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '';

  return `${dateRangeLabelFormatter.format(from)} - ${dateRangeLabelFormatter.format(to)}`;
}

function DateRangeSelect({ value, fromDate, toDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selectedPreset = DATE_RANGE_PRESETS.find((preset) => preset.value === value);
  const selectedLabel = selectedPreset?.label || 'Custom date range';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPreset = (preset) => {
    onChange(preset);
    setIsOpen(false);
  };

  return (
    <div className="date-range-select" ref={wrapperRef}>
      <button
        className="date-range-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
      >
        <span>{selectedLabel}</span>
        <span className="date-range-trigger-icon" aria-hidden="true">&#8964;</span>
      </button>
      {isOpen && (
        <div className="date-range-menu" role="listbox" aria-label="Date range">
          {DATE_RANGE_PRESETS.map((preset, index) => {
            const range = getReportDatePresetRange(preset.value);
            return (
              <div key={preset.value}>
                {index > 0 && DATE_RANGE_PRESETS[index - 1].group !== preset.group && <div className="date-range-menu-divider" />}
                <button
                  className={`date-range-option ${value === preset.value ? 'is-selected' : ''}`}
                  type="button"
                  role="option"
                  aria-selected={value === preset.value}
                  onClick={() => selectPreset(preset.value)}
                >
                  <span>{preset.label}</span>
                  <span>{formatDateRangeLabel(range.fromDate, range.toDate)}</span>
                </button>
              </div>
            );
          })}
          <div className="date-range-menu-divider" />
          <button
            className={`date-range-option ${value === 'custom' ? 'is-selected' : ''}`}
            type="button"
            role="option"
            aria-selected={value === 'custom'}
            onClick={() => selectPreset('custom')}
          >
            <span>Custom date range</span>
            <span>{formatDateRangeLabel(fromDate, toDate) || 'Select or type'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReportView({ tasks }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState('custom');
  const [reportType, setReportType] = useState('activities');
  const [clientSearch, setClientSearch] = useState('');
  const hasValidRange = Boolean(getInclusiveDateRange(fromDate, toDate));
  const hasDateInput = Boolean(fromDate || toDate);
  const hasSearch = Boolean(clientSearch.trim());
  const rows = useMemo(() => {
    const reportRows = hasValidRange
      ? (reportType === 'jobs' ? buildJobRows(tasks, fromDate, toDate) : buildActivityRows(tasks, fromDate, toDate))
      : (hasSearch ? buildSearchRows(tasks) : []);

    return filterRowsByClient(reportRows, clientSearch);
  }, [tasks, fromDate, toDate, reportType, clientSearch, hasSearch, hasValidRange]);

  const handleExport = () => {
    if (!rows.length) return;

    exportReportRows(rows, reportType, fromDate || 'all', toDate || 'all');
  };

  const handleDateRangePresetChange = (preset) => {
    setDateRangePreset(preset);

    const range = getReportDatePresetRange(preset);
    if (!range) return;

    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };

  const handleManualDateChange = (setDate) => (eventOrDate) => {
    setDateRangePreset('custom');
    setDate(typeof eventOrDate === 'string' ? eventOrDate : eventOrDate.target.value);
  };

  return (
    <div className="report-view">
      <div className="report-filters">
        <label>Layout
          <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
            <option value="activities">Activities</option>
            <option value="jobs">Jobs</option>
          </select>
        </label>
        <label>Search Client
          <ClientSearch tasks={tasks} value={clientSearch} onChange={setClientSearch} />
        </label>
        <label>From date<DatePickerInput ariaLabel="From date" value={fromDate} onChange={handleManualDateChange(setFromDate)} /></label>
        <label>To date<DatePickerInput ariaLabel="To date" value={toDate} onChange={handleManualDateChange(setToDate)} /></label>
        <div className="report-filter date-range-filter">
          <span className="report-filter-label">Date range</span>
          <DateRangeSelect value={dateRangePreset} fromDate={fromDate} toDate={toDate} onChange={handleDateRangePresetChange} />
        </div>
      </div>
      {hasDateInput && !hasValidRange ? (
        <p className="error" role="alert">Please select a valid date range.</p>
      ) : !hasValidRange && !hasSearch ? (
        <p className="empty">Search for a client or select a date range to generate report.</p>
      ) : rows.length === 0 ? (
        <p className="empty">No matching task found.</p>
      ) : (
        <div className="task-list report-table-wrap">
          <table className="task-table report-table">
            <thead>
              <tr>
                <th>Activity Date</th>
                <th>Client</th>
                <th>Task</th>
                <th>Software</th>
                <th>Current Status</th>
                <th>Action</th>
                <th>Updated Fields</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.activityDate)}</td>
                  <td>{row.client}</td>
                  <td>{row.taskName}</td>
                  <td>{row.software}</td>
                  <td>{row.currentStatus}</td>
                  <td>{row.action}</td>
                  <td>{row.updatedFields}</td>
                  <td className="report-detail-cell">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="report-actions">
        <button className="button-primary" type="button" disabled={!rows.length} onClick={handleExport}>Export</button>
      </div>
    </div>
  );
}

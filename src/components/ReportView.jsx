import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

const ACTION_LABELS = {
  created: 'Created Task',
  updated: 'Updated Task',
  deleted: 'Deleted Task',
};
const REPORT_TYPES = {
  activities: 'Activities',
  jobs: 'Jobs',
};

function getDateTime(value) {
  if (!value) return 0;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getRangeBounds(fromDate, toDate) {
  if (!fromDate || !toDate) return null;

  const from = new Date(`${fromDate}T00:00:00.000`);
  const to = new Date(`${toDate}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;

  return { from: from.getTime(), to: to.getTime() };
}

function formatDateTime(value) {
  if (!value) return '_';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '_';

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '_';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '_';
  return String(value);
}

function formatDetail(changes = []) {
  if (!changes.length) return '_';

  return changes
    .map((change) => `${change.label || change.field}: ${formatValue(change.from)} -> ${formatValue(change.to)}`)
    .join('\n');
}

function formatLogDetail(log) {
  const action = ACTION_LABELS[log.action] || log.action || 'Activity';
  return `${formatDateTime(log.changedAt)} - ${action}\n${formatDetail(log.changes)}`;
}

function getUpdatedFields(changes = []) {
  if (!changes.length) return '_';

  return changes.map((change) => change.label || change.field).filter(Boolean).join(', ');
}

function getLogsInRange(task, range) {
  return (Array.isArray(task.auditLogs) ? task.auditLogs : [])
    .filter((log) => {
      const changedAt = getDateTime(log.changedAt);
      return changedAt >= range.from && changedAt <= range.to;
    })
    .sort((first, second) => getDateTime(second.changedAt) - getDateTime(first.changedAt));
}

function buildActivityRows(tasks, fromDate, toDate) {
  const range = getRangeBounds(fromDate, toDate);
  if (!range) return [];

  return tasks
    .flatMap((task) => getLogsInRange(task, range).map((log, logIndex) => {
      const changedAt = getDateTime(log.changedAt);

      return {
        id: `${task._id}-${log.changedAt}-${log.action}-${logIndex}`,
        changedAt,
        activityDate: log.changedAt,
        client: task.title || '_',
        taskName: task.description || '_',
        software: task.software || '_',
        currentStatus: task.status || '_',
        action: ACTION_LABELS[log.action] || log.action || '_',
        updatedFields: getUpdatedFields(log.changes),
        detail: formatDetail(log.changes),
      };
    }))
    .sort((first, second) => second.changedAt - first.changedAt);
}

function buildJobRows(tasks, fromDate, toDate) {
  const range = getRangeBounds(fromDate, toDate);
  if (!range) return [];

  return tasks
    .map((task) => {
      const matchingLogs = getLogsInRange(task, range);
      if (!matchingLogs.length) return null;

      const latestLog = matchingLogs[0];
      const changedAt = getDateTime(latestLog.changedAt);
      const actions = Array.from(new Set(matchingLogs.map((log) => ACTION_LABELS[log.action] || log.action).filter(Boolean)));
      const updatedFields = Array.from(new Set(
        matchingLogs.flatMap((log) => (Array.isArray(log.changes) ? log.changes : []).map((change) => change.label || change.field).filter(Boolean))
      ));

      return {
        id: task._id,
        changedAt,
        activityDate: latestLog.changedAt,
        client: task.title || '_',
        taskName: task.description || '_',
        software: task.software || '_',
        currentStatus: task.status || '_',
        action: actions.length ? actions.join(', ') : '_',
        updatedFields: updatedFields.length ? updatedFields.join(', ') : '_',
        detail: matchingLogs.map(formatLogDetail).join('\n\n'),
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.changedAt - first.changedAt);
}

function filterRowsByClient(rows, clientSearch) {
  const keyword = clientSearch.trim().toLowerCase();
  if (!keyword) return rows;

  return rows.filter((row) => row.client.toLowerCase().includes(keyword));
}

export default function ReportView({ tasks }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState('activities');
  const [clientSearch, setClientSearch] = useState('');
  const rows = useMemo(() => {
    const reportRows = reportType === 'jobs'
      ? buildJobRows(tasks, fromDate, toDate)
      : buildActivityRows(tasks, fromDate, toDate);

    return filterRowsByClient(reportRows, clientSearch);
  }, [tasks, fromDate, toDate, reportType, clientSearch]);
  const hasValidRange = Boolean(getRangeBounds(fromDate, toDate));

  const handleExport = () => {
    if (!rows.length) return;

    const data = rows.map((row) => ({
      'Activity Date': formatDateTime(row.activityDate),
      Client: row.client,
      Task: row.taskName,
      Software: row.software,
      'Current Status': row.currentStatus,
      Action: row.action,
      'Updated Fields': row.updatedFields,
      Detail: row.detail,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 24 },
      { wch: 28 },
      { wch: 16 },
      { wch: 28 },
      { wch: 16 },
      { wch: 30 },
      { wch: 60 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${REPORT_TYPES[reportType]} Report`);
    XLSX.writeFile(workbook, `task-${reportType}-report-${fromDate}-to-${toDate}.xlsx`);
  };

  return (
    <div className="report-view">
      <div className="content-header report-header">
        <div>
          <h2>Report</h2>
          <p>Search task activity history by date range.</p>
        </div>
      </div>
      <div className="report-filters">
        <label>Layout
          <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
            <option value="activities">Activities</option>
            <option value="jobs">Jobs</option>
          </select>
        </label>
        <label>Search Client
          <input type="search" placeholder="Search by client..." value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} />
        </label>
        <label>From date<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label>To date<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
      </div>
      {!fromDate || !toDate ? (
        <p className="empty">Select a date range to generate report.</p>
      ) : !hasValidRange ? (
        <p className="error" role="alert">Please select a valid date range.</p>
      ) : rows.length === 0 ? (
        <p className="empty">No activity found in this date range.</p>
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

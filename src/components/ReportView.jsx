import { useMemo, useState } from 'react';
import ClientSearch from '../features/reports/components/ClientSearch';
import { exportReportRows } from '../features/reports/logic/reportExport';
import { buildActivityRows, buildJobRows, buildSearchRows, filterRowsByClient } from '../features/reports/logic/reportRows';
import { formatDateTime, getInclusiveDateRange } from '../shared/utils/dateUtils';

export default function ReportView({ tasks }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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
        <label>From date<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label>To date<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
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

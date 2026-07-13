import * as XLSX from 'xlsx';
import { formatDateTime } from '../../../shared/utils/dateUtils';
import { REPORT_TYPES } from '../utils/reportFormatters';

export function exportReportRows(rows, reportType, fromDate, toDate, filename) {
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
  XLSX.writeFile(workbook, filename || `task-${reportType}-report-${fromDate}-to-${toDate}.xlsx`);
}

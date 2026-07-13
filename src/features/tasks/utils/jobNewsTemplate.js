import * as XLSX from 'xlsx';

const HEADERS = [
  'Client / Job Name',
  'Task Description',
  'Time spent (hrs)',
  'Assigned Date',
  'Actual Completion Date',
  'Status',
  'Outcome Achieved',
  'Issues / Roadblocks',
  'Communication & Escalation',
  'WP / Evidence Completed?',
];

export function downloadJobNewsTemplate() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['HBM Partners - Job Completed'],
    [],
    ['Staff Name', ''],
    ['Date', ''],
    ['Working Hours', ''],
    ['Manager', ''],
    [],
    ['Job Completed'],
    [],
    HEADERS,
    ['', '', '', '', '', '', '', '', '', ''],
  ]);

  sheet['!cols'] = [
    { wch: 34 }, { wch: 48 }, { wch: 18 }, { wch: 16 }, { wch: 24 },
    { wch: 24 }, { wch: 42 }, { wch: 36 }, { wch: 36 }, { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Job Completed');
  XLSX.writeFile(workbook, 'job-news-template.xlsx');
}

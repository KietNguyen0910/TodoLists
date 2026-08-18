import { getStatusLabel } from '../../../shared/config/statusConfig';

let XLSX;

const TEMPLATE_URL = `${process.env.PUBLIC_URL || ''}/templates/monthly-outcome-updates-template.xlsx`;
export const MONTHLY_OUTCOME_FILENAME = '2026 Monthly Outcome Updates - Cassie N.xlsx';
const WORKSHEET_PATH = 'xl/worksheets/sheet1.xml';
const WORKBOOK_PATH = 'xl/workbook.xml';
const FIRST_DATA_ROW = 8;
const LAST_TEMPLATE_ROW = 1000;
const DATA_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function isActiveTask(task) {
  return !(task.deleted || task.isDeleted);
}

function getCreatedDate(task) {
  const date = new Date(task.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function compareText(first, second) {
  return String(first || '').localeCompare(String(second || ''), undefined, { sensitivity: 'base' });
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getCfbPath(path) {
  return path.startsWith('/') ? path : `/${path}`;
}

function getTextContent(cfb, path) {
  const entry = XLSX.CFB.find(cfb, getCfbPath(path));
  if (!entry?.content) throw new Error(`Template file is missing ${path}.`);
  return new TextDecoder().decode(entry.content);
}

function setTextContent(cfb, path, value) {
  XLSX.CFB.utils.cfb_add(cfb, getCfbPath(path), new TextEncoder().encode(value));
}

function getCellAttributes(cellXml, cellReference) {
  const openingTag = cellXml.match(new RegExp(`^<c\\s+r="${cellReference}"([^>]*)`));
  return (openingTag?.[1] || '')
    .replace(/\s+t="[^"]*"/g, '')
    .replace(/\/$/, '');
}

function setCellText(sheetXml, column, row, value) {
  if (!value) return sheetXml;

  const cellReference = `${column}${row}`;
  const cellPattern = new RegExp(`<c\\s+r="${cellReference}"[^>]*(?:\\/>|>[\\s\\S]*?<\\/c>)`);
  return sheetXml.replace(cellPattern, (cellXml) => {
    const attributes = getCellAttributes(cellXml, cellReference);
    const text = escapeXml(value);
    const space = /^\s|\s$/.test(String(value)) ? ' xml:space="preserve"' : '';
    return `<c r="${cellReference}"${attributes} t="inlineStr"><is><t${space}>${text}</t></is></c>`;
  });
}

export function getMonthlyOutcomeSheetName(monthIndex) {
  return MONTH_NAMES[monthIndex] || MONTH_NAMES[0];
}

export function buildMonthlyOutcomeRows(tasks, year, monthIndex) {
  return tasks
    .filter(isActiveTask)
    .map((task) => ({ task, createdAt: getCreatedDate(task) }))
    .filter(({ createdAt }) => createdAt && createdAt.getFullYear() === year && createdAt.getMonth() === monthIndex)
    .sort((first, second) => (
      compareText(first.task.title, second.task.title)
      || compareText(first.task.description, second.task.description)
      || first.createdAt - second.createdAt
    ))
    .map(({ task, createdAt }) => ({
      jobName: task.title || '',
      taskName: task.description || '',
      dateReceived: dateFormatter.format(createdAt),
      currentStatus: getStatusLabel(task.status),
      deadline: '',
      totalHours: '',
      link: '',
    }));
}

export function updateMonthlyOutcomeWorksheet(sheetXml, rows) {
  if (rows.length > LAST_TEMPLATE_ROW - FIRST_DATA_ROW + 1) {
    throw new Error('The Monthly Outcome Update template supports up to 993 tasks.');
  }

  return rows.reduce((updatedXml, row, index) => {
    const rowNumber = FIRST_DATA_ROW + index;
    const values = [
      row.jobName,
      row.taskName,
      row.dateReceived,
      row.currentStatus,
      row.deadline,
      row.totalHours,
      row.link,
    ];

    return values.reduce((nextXml, value, columnIndex) => (
      setCellText(nextXml, DATA_COLUMNS[columnIndex], rowNumber, value)
    ), updatedXml);
  }, sheetXml);
}

export function updateMonthlyOutcomeWorkbook(workbookXml, monthIndex) {
  const sheetName = getMonthlyOutcomeSheetName(monthIndex);
  return workbookXml.replace(/(<sheet\s+name=")[^"]+("\s+sheetId=)/, `$1${sheetName}$2`);
}

function downloadWorkbook(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function exportMonthlyOutcomeTasks(tasks, year, monthIndex) {
  XLSX = XLSX || await import('xlsx');
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error('Unable to load the Monthly Outcome Update template.');

  const cfb = XLSX.CFB.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
  const rows = buildMonthlyOutcomeRows(tasks, year, monthIndex);
  setTextContent(cfb, WORKSHEET_PATH, updateMonthlyOutcomeWorksheet(getTextContent(cfb, WORKSHEET_PATH), rows));
  setTextContent(cfb, WORKBOOK_PATH, updateMonthlyOutcomeWorkbook(getTextContent(cfb, WORKBOOK_PATH), monthIndex));
  downloadWorkbook(XLSX.CFB.write(cfb, { type: 'array', fileType: 'zip', compression: true }), MONTHLY_OUTCOME_FILENAME);

  return { filename: MONTHLY_OUTCOME_FILENAME, taskCount: rows.length };
}

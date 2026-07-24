let XLSX;

const STATUS_ALIASES = new Map([
  ['lodged completed', 'Lodged/Completed'],
  ['out to sign', 'Out To Sign'],
  ['singed', 'Singed'],
  ['waiting manager review', 'Waiting for review'],
  ['waiting for review', 'Waiting for review'],
  ['waiting client', 'Waiting client'],
  ['sent query to manager', 'Sent query for Manager'],
  ['sent query for manager', 'Sent query for Manager'],
  ['sent email to manager', 'Sent query for Manager'],
  ['in progress', 'In Progress'],
  ['initial information received', 'Initial Information Received'],
  ['information received', 'Initial Information Received'],
  ['not started', 'Initial Information Received'],
  ['on hold', 'On hold'],
  ['sent report to client', 'Sent Report to client'],
]);

const HEADER_NAMES = {
  title: 'client job name',
  description: 'task description',
  outcomeAchieved: 'outcome achieved',
  assignDate: 'assigned date',
  deadline: 'due date',
  completionDate: 'actual completion date',
  status: 'status',
  timeSpent: 'time spent hrs',
  issues: 'issues roadblocks',
  communication: 'communication escalation',
  evidence: 'wp evidence completed',
};

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeStatus(value) {
  return STATUS_ALIASES.get(normalizeHeader(value)) || null;
}

function formatDate(value) {
  if (!value) return '';

  if (typeof value === 'number') {
    const parts = XLSX.SSF.parse_date_code(value);
    if (!parts) return '';
    return `${parts.y}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function splitOutcomes(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((item) => item.replace(/^\s*[+\-\u2022]+\s*/, '').trim())
    .filter(Boolean);
}

function buildNotes(row, columns) {
  const entries = [
    ['Time spent (hrs)', row[columns.timeSpent]],
    ['Issues / Roadblocks', row[columns.issues]],
    ['Communication & Escalation', row[columns.communication]],
    ['WP / Evidence Completed', row[columns.evidence]],
  ].filter(([, value]) => normalizeText(value));

  return entries.map(([label, value]) => `${label}: ${String(value).trim()}`).join('\n\n');
}

function getImportKey(task) {
  return `${normalizeText(task.title).toLowerCase()}\u0000${normalizeText(task.description).toLowerCase()}`;
}

function findHeaderRow(rows) {
  return rows.findIndex((row) => row.some((cell) => normalizeHeader(cell) === HEADER_NAMES.title));
}

function buildColumnMap(headerRow) {
  const columns = {};

  Object.entries(HEADER_NAMES).forEach(([field, header]) => {
    columns[field] = headerRow.findIndex((cell) => normalizeHeader(cell) === header);
  });

  return columns;
}

function getCell(row, index) {
  return index >= 0 ? row[index] : '';
}

function parseWorksheet(sheet, sheetName) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex < 0) return { tasks: [], invalidRows: [] };

  const columns = buildColumnMap(rows[headerRowIndex]);
  const tasks = [];
  const invalidRows = [];

  rows.slice(headerRowIndex + 1).forEach((row, index) => {
    if (!row.some((value) => normalizeText(value))) return;

    const rowNumber = headerRowIndex + index + 2;
    const title = normalizeText(getCell(row, columns.title));
    const description = normalizeText(getCell(row, columns.description));
    const status = normalizeStatus(getCell(row, columns.status));
    const source = `${sheetName} / row ${rowNumber}`;

    if (!title || !description) {
      invalidRows.push({ source, reason: 'Client and Task Description are required.' });
      return;
    }

    if (!status) {
      invalidRows.push({ source, reason: `Unsupported status: ${normalizeText(getCell(row, columns.status)) || 'empty'}.` });
      return;
    }

    tasks.push({
      title,
      description,
      outcomeAchieved: splitOutcomes(getCell(row, columns.outcomeAchieved)),
      assignDate: formatDate(getCell(row, columns.assignDate)),
      deadline: formatDate(getCell(row, columns.deadline)),
      completionDate: formatDate(getCell(row, columns.completionDate)),
      notes: buildNotes(row, columns),
      status,
      source,
    });
  });

  return { tasks, invalidRows };
}

export async function parseExcelFile(file) {
  XLSX = XLSX || await import('xlsx');
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const allTasks = [];
  const invalidRows = [];
  const activeSheetIndex = workbook.Workbook?.WBView?.[0]?.activeTab
    ?? workbook.Workbook?.Views?.[0]?.activeTab
    ?? workbook.Workbook?.WBProps?.activeTab;
  const sheetMetadata = workbook.Workbook?.Sheets || [];
  const activeSheetName = workbook.SheetNames[activeSheetIndex];
  const isActiveSheetVisible = sheetMetadata[activeSheetIndex]?.Hidden !== 1 && sheetMetadata[activeSheetIndex]?.Hidden !== 2;
  const visibleSheetNames = workbook.SheetNames.filter((sheetName, index) => (
    sheetMetadata[index]?.Hidden !== 1 && sheetMetadata[index]?.Hidden !== 2
  ));
  const sheetNames = activeSheetName && isActiveSheetVisible
    ? [activeSheetName]
    : visibleSheetNames.slice(0, 1);

  sheetNames.forEach((sheetName) => {
    const result = parseWorksheet(workbook.Sheets[sheetName], sheetName);
    allTasks.push(...result.tasks);
    invalidRows.push(...result.invalidRows);
  });

  const latestTasks = new Map();
  const duplicateRows = [];
  allTasks.forEach((task) => {
    const key = getImportKey(task);
    const previousTask = latestTasks.get(key);
    if (previousTask) duplicateRows.push({ source: previousTask.source, reason: `Replaced by later row ${task.source}.` });
    latestTasks.set(key, task);
  });

  return { tasks: Array.from(latestTasks.values()), invalidRows, duplicateRows, sheetNames };
}

export function buildImportPreview(parsedImport, existingTasks) {
  const existingKeys = new Set(
    existingTasks
      .filter((task) => !(task.deleted || task.isDeleted))
      .map(getImportKey)
  );
  const existingDuplicates = [];
  const tasks = [];

  parsedImport.tasks.forEach(({ source, ...task }) => {
    if (existingKeys.has(getImportKey(task))) {
      existingDuplicates.push({ source, reason: 'Task already exists in the app.' });
      return;
    }
    tasks.push(task);
  });

  return {
    ...parsedImport,
    tasks,
    existingDuplicates,
  };
}

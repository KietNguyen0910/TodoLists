import { getStatusLabel } from '../../../shared/config/statusConfig';

let XLSX;

const TEMPLATE_URL = `${process.env.PUBLIC_URL || ''}/templates/daily-outcome-updates-template.xlsx`;
const TEMPLATE_SHEET_PATH = 'xl/worksheets/sheet5.xml';
const START_ROW = 20;
const HEADER_ROW = START_ROW - 1;
const SHEET_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RELATIONSHIP_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
const REMOVED_SHEET_NUMBERS = [1, 2, 3, 4, 6];

const NOTE_HEADINGS = [
  { key: 'timeSpent', pattern: /^time spent(?:\s*\(hrs\))?$/i },
  { key: 'issues', pattern: /^issues\s*\/\s*roadblocks$/i },
  { key: 'communication', pattern: /^communication\s*&\s*escalation$/i },
  { key: 'evidence', pattern: /^wp\s*\/\s*evidence\s*completed\??$/i },
];

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getNoteHeadingKey(value) {
  const normalizedValue = value.trim().replace(/\s+/g, ' ');
  return NOTE_HEADINGS.find(({ pattern }) => pattern.test(normalizedValue))?.key || null;
}

export function splitDailyOutcomeNotes(notes) {
  const values = { timeSpent: '', issues: '', communication: '', evidence: '' };
  let activeKey = null;
  const lines = String(notes || '').replace(/\r\n?/g, '\n').split('\n');

  const saveActiveValue = (linesToSave) => {
    if (!activeKey) return;
    values[activeKey] = linesToSave.join('\n').replace(/^\n+|\n+$/g, '').trim();
  };

  let activeLines = [];
  lines.forEach((line) => {
    const headingMatch = line.match(/^\s*([^:]+?)\s*:\s*(.*)$/);
    const nextKey = headingMatch ? getNoteHeadingKey(headingMatch[1]) : null;
    if (nextKey) {
      saveActiveValue(activeLines);
      activeKey = nextKey;
      activeLines = [headingMatch[2]];
      return;
    }

    if (activeKey) activeLines.push(line);
  });
  saveActiveValue(activeLines);

  return values;
}

function getOutcomesText(outcomes) {
  const values = Array.isArray(outcomes) ? outcomes : outcomes ? [outcomes] : [];
  return values
    .map((outcome) => String(outcome || '').trim())
    .filter(Boolean)
    .map((outcome) => `+ ${outcome}`)
    .join('\n');
}

export function buildDailyOutcomeRows(tasks) {
  return tasks.map((task) => {
    const noteValues = splitDailyOutcomeNotes(task.notes);
    return {
      client: task.title || '',
      task: task.description || '',
      outcomes: getOutcomesText(task.outcomeAchieved),
      assignDate: task.assignDate || '',
      deadline: task.deadline || '',
      completionDate: task.completionDate || '',
      status: getStatusLabel(task.status),
      ...noteValues,
    };
  });
}

function getDateParts(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) };

  const dateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateMatch) return { year: Number(dateMatch[3]), month: Number(dateMatch[2]), day: Number(dateMatch[1]) };

  return null;
}

function toExcelSerial(value) {
  const parts = getDateParts(value);
  if (!parts) return null;
  const timestamp = Date.UTC(parts.year, parts.month - 1, parts.day);
  if (Number.isNaN(timestamp)) return null;
  return Math.round((timestamp - Date.UTC(1899, 11, 30)) / 86400000);
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

function deleteFile(cfb, path) {
  XLSX.CFB.utils.cfb_del(cfb, getCfbPath(path));
}

function parseXml(xml, path) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error(`Template XML is invalid: ${path}.`);
  return document;
}

function serializeXml(document) {
  return new XMLSerializer().serializeToString(document);
}

function getCellStyle(sheetXml, column) {
  const cellPattern = new RegExp(`<c r="${column}(\\d+)"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)`, 'g');
  let fallbackStyle = '1';
  let match;

  while ((match = cellPattern.exec(sheetXml))) {
    if (Number(match[1]) < START_ROW) continue;
    const style = match[2].match(/\bs="(\d+)"/)?.[1] || '1';
    if (style !== '1') fallbackStyle = style;
    if (match[3]?.match(/<(?:v|is)\b/)) return style;
  }

  return fallbackStyle;
}

function getColumnStyles(sheetXml) {
  return Object.fromEntries(COLUMNS.map((column) => [column, getCellStyle(sheetXml, column)]));
}

function buildTextCell(column, row, style, value) {
  const text = String(value || '');
  if (!text) return `<c r="${column}${row}" s="${style}"/>`;
  const preserveSpace = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
  return `<c r="${column}${row}" s="${style}" t="inlineStr"><is><t${preserveSpace}>${escapeXml(text)}</t></is></c>`;
}

function buildDateCell(column, row, style, value) {
  const serial = toExcelSerial(value);
  return serial === null
    ? `<c r="${column}${row}" s="${style}"/>`
    : `<c r="${column}${row}" s="${style}"><v>${serial}</v></c>`;
}

function getRowHeight(values) {
  const lineCount = Math.max(...values.map((value) => String(value || '').split('\n').length));
  return Math.min(150, Math.max(20, lineCount * 15 + 8));
}

function buildDataRow(rowNumber, row, styles) {
  const values = [row.client, row.task, row.outcomes, row.status, row.timeSpent, row.issues, row.communication, row.evidence];
  const height = getRowHeight(values);
  return `<row r="${rowNumber}" ht="${height}" customHeight="1">${[
    buildTextCell('A', rowNumber, styles.A, row.client),
    buildTextCell('B', rowNumber, styles.B, row.task),
    buildTextCell('C', rowNumber, styles.C, row.outcomes),
    buildDateCell('D', rowNumber, styles.D, row.assignDate),
    buildDateCell('E', rowNumber, styles.E, row.deadline),
    buildDateCell('F', rowNumber, styles.F, row.completionDate),
    buildTextCell('G', rowNumber, styles.G, row.status),
    buildTextCell('H', rowNumber, styles.H, row.timeSpent),
    buildTextCell('I', rowNumber, styles.I, row.issues),
    buildTextCell('J', rowNumber, styles.J, row.communication),
    buildTextCell('K', rowNumber, styles.K, row.evidence),
  ].join('')}</row>`;
}

function updateWorksheet(sheetXml, rows) {
  const styles = getColumnStyles(sheetXml);
  const dataRows = rows.map((row, index) => buildDataRow(START_ROW + index, row, styles)).join('');
  const existingData = sheetXml.match(/<sheetData>([\s\S]*?)<\/sheetData>/);
  if (!existingData) throw new Error('Template worksheet does not contain data rows.');

  const headerRows = Array.from(existingData[1].matchAll(/<row\b[^>]*\br="(\d+)"[\s\S]*?<\/row>/g))
    .filter((match) => Number(match[1]) < START_ROW)
    .map((match) => match[0])
    .join('');
  const lastRow = HEADER_ROW + rows.length;
  const updatedData = `<sheetData>${headerRows}${dataRows}</sheetData>`;

  return {
    lastRow,
    xml: sheetXml
      .replace(/<sheetData>[\s\S]*?<\/sheetData>/, updatedData)
      .replace(/<dimension\s+ref="[^"]*"\s*\/>/, `<dimension ref="A1:K${lastRow}"/>`)
      .replace(/<autoFilter\b[\s\S]*?<\/autoFilter>|<autoFilter\b[^>]*\/>/, `<autoFilter ref="A${HEADER_ROW}:K${lastRow}"/>`),
  };
}

function keepOnlyTemplateSheet(cfb, lastRow) {
  const relsPath = 'xl/_rels/workbook.xml.rels';
  const relsDocument = parseXml(getTextContent(cfb, relsPath), relsPath);
  const relationships = Array.from(relsDocument.documentElement.children);
  const templateRelation = relationships.find((relationship) => relationship.getAttribute('Target') === 'worksheets/sheet5.xml');
  if (!templateRelation) throw new Error('Template worksheet relationship was not found.');
  const relationshipId = templateRelation.getAttribute('Id');

  relationships.forEach((relationship) => {
    const type = relationship.getAttribute('Type') || '';
    if ((type.endsWith('/worksheet') && relationship !== templateRelation) || type.endsWith('/calcChain')) {
      relationship.remove();
    }
  });
  setTextContent(cfb, relsPath, serializeXml(relsDocument));

  const workbookPath = 'xl/workbook.xml';
  const workbookDocument = parseXml(getTextContent(cfb, workbookPath), workbookPath);
  Array.from(workbookDocument.getElementsByTagNameNS(SHEET_NAMESPACE, 'sheet')).forEach((sheet) => {
    const sheetRelationshipId = sheet.getAttributeNS(RELATIONSHIP_NAMESPACE, 'id') || sheet.getAttribute('r:id');
    if (sheetRelationshipId !== relationshipId) sheet.remove();
  });
  const workbookView = workbookDocument.getElementsByTagNameNS(SHEET_NAMESPACE, 'workbookView')[0];
  if (workbookView) {
    workbookView.setAttribute('firstSheet', '0');
    workbookView.setAttribute('activeTab', '0');
  }
  const templateSheet = workbookDocument.getElementsByTagNameNS(SHEET_NAMESPACE, 'sheet')[0];
  if (!templateSheet) throw new Error('Template worksheet metadata was not found.');
  templateSheet.setAttribute('sheetId', '1');
  const sheetName = templateSheet.getAttribute('name');

  Array.from(workbookDocument.getElementsByTagNameNS(SHEET_NAMESPACE, 'definedNames')).forEach((definedNames) => definedNames.remove());
  const definedNames = workbookDocument.createElementNS(SHEET_NAMESPACE, 'definedNames');
  const filterName = workbookDocument.createElementNS(SHEET_NAMESPACE, 'definedName');
  filterName.setAttribute('name', '_xlnm._FilterDatabase');
  filterName.setAttribute('localSheetId', '0');
  filterName.setAttribute('hidden', '1');
  filterName.textContent = `'${sheetName.replace(/'/g, "''")}'!$A$${HEADER_ROW}:$K$${lastRow}`;
  definedNames.appendChild(filterName);
  const calcProperties = workbookDocument.getElementsByTagNameNS(SHEET_NAMESPACE, 'calcPr')[0];
  workbookDocument.documentElement.insertBefore(definedNames, calcProperties || null);
  setTextContent(cfb, workbookPath, serializeXml(workbookDocument));

  const contentTypesPath = '[Content_Types].xml';
  const contentTypesDocument = parseXml(getTextContent(cfb, contentTypesPath), contentTypesPath);
  Array.from(contentTypesDocument.documentElement.children).forEach((entry) => {
    const partName = entry.getAttribute('PartName') || '';
    if (/^\/xl\/worksheets\/sheet(?:1|2|3|4|6)\.xml$/.test(partName) || partName === '/xl/calcChain.xml') entry.remove();
  });
  setTextContent(cfb, contentTypesPath, serializeXml(contentTypesDocument));

  REMOVED_SHEET_NUMBERS.forEach((sheetNumber) => {
    deleteFile(cfb, `xl/worksheets/sheet${sheetNumber}.xml`);
    deleteFile(cfb, `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`);
  });
  deleteFile(cfb, 'xl/calcChain.xml');
}

export function getDailyOutcomeFilename(tabTitle, date = new Date()) {
  const title = String(tabTitle || 'Tasks').trim() || 'Tasks';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${title} - ${day}.${month}.${year} - Cassie.xlsx`;
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

export async function exportDailyOutcomeTasks(tasks, tabTitle, { filename, allowEmpty = false } = {}) {
  if (!tasks.length && !allowEmpty) return null;
  XLSX = XLSX || await import('xlsx');
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error('Unable to load the Daily Outcome Updates template.');

  const cfb = XLSX.CFB.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
  const rows = buildDailyOutcomeRows(tasks);
  const worksheet = updateWorksheet(getTextContent(cfb, TEMPLATE_SHEET_PATH), rows);
  setTextContent(cfb, TEMPLATE_SHEET_PATH, worksheet.xml);
  keepOnlyTemplateSheet(cfb, worksheet.lastRow);

  const exportFilename = filename || getDailyOutcomeFilename(tabTitle);
  downloadWorkbook(XLSX.CFB.write(cfb, { type: 'array', fileType: 'zip', compression: true }), exportFilename);
  return exportFilename;
}

import * as XLSX from 'xlsx';
import { buildImportPreview, parseExcelFile } from './excelImport';

const headers = [
  'Client / Job Name',
  'Task Description',
  'Outcome Achieved',
  'Assigned Date',
  'Due Date',
  'Actual Completion Date',
  'Status',
  'Time spent (hrs)',
  'Issues / Roadblocks',
  'Communication & Escalation',
  'WP / Evidence Completed?',
];

function createExcelFile(sheets, activeSheetIndex = 0) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(([name, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name));
  workbook.Workbook = {
    ...(workbook.Workbook || {}),
    // SheetJS writes the first visible worksheet as the active sheet.
    Sheets: sheets.map(([_name], index) => ({ Hidden: activeSheetIndex > 0 && index < activeSheetIndex ? 1 : 0 })),
  };
  const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return { arrayBuffer: async () => data };
}

describe('Excel task import', () => {
  it('imports only the active worksheet and normalizes statuses', async () => {
    const file = createExcelFile([
      ['Week 1', [
        ['Weekly updates'],
        headers,
        ['Acme Pty Ltd', '2026 BAS', '+ Prepare WPP\n+ Send query', 46174, 46180, '', 'Waiting Manager Review', 2, 'Need bank statement', 'Email sent', 'Yes - WP Attached'],
      ]],
      ['Week 2', [
        headers,
        ['Acme Pty Ltd', '2026 BAS', '+ Finalised BAS', 46174, 46180, 46181, 'Lodged / Completed', '', '', '', 'Yes - WP Attached'],
      ]],
      ['Sheet1', [['No task table here']]],
    ], 1);

    const result = await parseExcelFile(file);

    expect(result.invalidRows).toEqual([]);
    expect(result.duplicateRows).toHaveLength(0);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      title: 'Acme Pty Ltd',
      description: '2026 BAS',
      outcomeAchieved: ['Finalised BAS'],
      status: 'Lodged/Completed',
    });
    expect(result.tasks[0].assignDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.tasks[0].completionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.sheetNames).toEqual(['Week 2']);
  });

  it('reports invalid rows and excludes tasks that already exist', async () => {
    const file = createExcelFile([['Weekly', [
      headers,
      ['Existing client', 'Existing task', '', '', '', '', 'Information Received', '', '', '', ''],
      ['Missing status', 'Task', '', '', '', '', '', '', '', '', ''],
    ]]]);

    const parsed = await parseExcelFile(file);
    const preview = buildImportPreview(parsed, [{ title: ' existing CLIENT ', description: 'Existing Task' }]);

    expect(parsed.invalidRows).toHaveLength(1);
    expect(preview.tasks).toEqual([]);
    expect(preview.existingDuplicates).toHaveLength(1);
  });

  it('allows a previously soft-deleted task to be imported again', async () => {
    const file = createExcelFile([['Weekly', [
      headers,
      ['Archived client', 'Archived task', '', '', '', '', 'In Progress', '', '', '', ''],
    ]]]);

    const parsed = await parseExcelFile(file);
    const preview = buildImportPreview(parsed, [{
      title: 'Archived client',
      description: 'Archived task',
      deleted: true,
      isDeleted: true,
    }]);

    expect(preview.tasks).toHaveLength(1);
    expect(preview.existingDuplicates).toEqual([]);
  });

  it('normalizes the Out To Sign and Singed statuses', async () => {
    const file = createExcelFile([['Weekly', [
      headers,
      ['Signing client', 'Send documents', '', '', '', '', 'Out To Sign', '', '', '', ''],
      ['Signed client', 'Archive documents', '', '', '', '', 'Singed', '', '', '', ''],
    ]]]);

    const result = await parseExcelFile(file);

    expect(result.invalidRows).toEqual([]);
    expect(result.tasks.map((task) => task.status)).toEqual(['Out To Sign', 'Singed']);
  });
});

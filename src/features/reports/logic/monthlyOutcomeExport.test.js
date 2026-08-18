import {
  MONTHLY_OUTCOME_FILENAME,
  buildMonthlyOutcomeRows,
  getMonthlyOutcomeSheetName,
  updateMonthlyOutcomeWorkbook,
  updateMonthlyOutcomeWorksheet,
} from './monthlyOutcomeExport';

describe('Monthly Outcome Update rows', () => {
  it('filters active tasks by created month and groups them by Job Name', () => {
    const rows = buildMonthlyOutcomeRows([
      { _id: 'beta', title: 'Beta Client', description: 'Second task', createdAt: '2026-08-12T09:00:00.000Z', status: 'Waiting for final Review' },
      { _id: 'deleted', title: 'Deleted Client', description: 'Ignored', createdAt: '2026-08-12T09:00:00.000Z', status: 'In Progress', deleted: true },
      { _id: 'july', title: 'Alpha Client', description: 'Ignored', createdAt: '2026-07-31T09:00:00.000Z', status: 'In Progress' },
      { _id: 'alpha-later', title: 'Alpha Client', description: 'Z task', createdAt: '2026-08-13T09:00:00.000Z', status: 'In Progress' },
      { _id: 'alpha-first', title: 'Alpha Client', description: 'A task', createdAt: '2026-08-02T09:00:00.000Z', status: 'Sent Report to client' },
    ], 2026, 7);

    expect(rows).toEqual([
      {
        jobName: 'Alpha Client', taskName: 'A task', dateReceived: '02/08/2026', currentStatus: 'Sent Report to Client', deadline: '', totalHours: '', link: '',
      },
      {
        jobName: 'Alpha Client', taskName: 'Z task', dateReceived: '13/08/2026', currentStatus: 'In Progress', deadline: '', totalHours: '', link: '',
      },
      {
        jobName: 'Beta Client', taskName: 'Second task', dateReceived: '12/08/2026', currentStatus: 'Waiting for Final Review', deadline: '', totalHours: '', link: '',
      },
    ]);
  });
});

describe('Monthly Outcome Update workbook', () => {
  const templateWorksheet = `<worksheet><dimension ref="A1:AF1000"/><sheetData><row r="7"><c r="A7" s="5"/></row><row r="8"><c r="A8" s="6"/><c r="B8" s="6"/><c r="C8" s="6"/><c r="D8" s="6"/><c r="E8" s="6"/><c r="F8" s="6"/><c r="G8" s="6"/></row></sheetData><mergeCells count="1"><mergeCell ref="E1:P2"/></mergeCells></worksheet>`;

  it('writes the seven report columns without changing the template structure', () => {
    const updated = updateMonthlyOutcomeWorksheet(templateWorksheet, [{
      jobName: 'Alpha & Co', taskName: '2026 tax return', dateReceived: '02/08/2026', currentStatus: 'In Progress', deadline: '', totalHours: '', link: '',
    }]);

    expect(updated).toContain('<c r="A8" s="6" t="inlineStr"><is><t>Alpha &amp; Co</t></is></c>');
    expect(updated).toContain('<c r="C8" s="6" t="inlineStr"><is><t>02/08/2026</t></is></c>');
    expect(updated).toContain('<c r="D8" s="6" t="inlineStr"><is><t>In Progress</t></is></c>');
    expect(updated).toContain('<mergeCell ref="E1:P2"/>');
    expect(updated).toContain('<dimension ref="A1:AF1000"/>');
  });

  it('keeps the required filename and renames the sole worksheet for the selected month', () => {
    expect(MONTHLY_OUTCOME_FILENAME).toBe('2026 Monthly Outcome Updates - Cassie N.xlsx');
    expect(getMonthlyOutcomeSheetName(2)).toBe('March');
    expect(updateMonthlyOutcomeWorkbook('<workbook><sheets><sheet name="August" sheetId="3" r:id="rId1"/></sheets></workbook>', 2))
      .toContain('<sheet name="March" sheetId="3"');
  });
});

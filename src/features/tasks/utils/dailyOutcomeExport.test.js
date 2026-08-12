import { buildDailyOutcomeRows, getDailyOutcomeFilename, splitDailyOutcomeNotes, updateDailyOutcomeWorksheet } from './dailyOutcomeExport';

describe('Daily Outcome Updates export filename', () => {
  const exportDate = new Date(2026, 6, 22);

  it.each([
    ['Information Received', 'Information Received - 22.07.26 - Cassie.xlsx'],
    ['In Progress', 'In Progress - 22.07.26 - Cassie.xlsx'],
    ['Waiting Information Request', 'Waiting Information Request - 22.07.26 - Cassie.xlsx'],
    ['Waiting for final Review', 'Waiting for final Review - 22.07.26 - Cassie.xlsx'],
    ['Completed Tasks', 'Completed Tasks - 22.07.26 - Cassie.xlsx'],
  ])('uses the tab title and date for %s', (tabTitle, expectedFilename) => {
    expect(getDailyOutcomeFilename(tabTitle, exportDate)).toBe(expectedFilename);
  });
});

describe('Daily Outcome Updates export rows', () => {
  it('splits the labelled note blocks into their template columns', () => {
    expect(splitDailyOutcomeNotes('Time spent (hrs): 2.5\n\nIssues / Roadblocks: Missing bank statement\nFollowed up today\n\nCommunication & Escalation: Email sent\n\nWP / Evidence Completed: Yes - WP Attached')).toEqual({
      timeSpent: '2.5',
      issues: 'Missing bank statement\nFollowed up today',
      communication: 'Email sent',
      evidence: 'Yes - WP Attached',
    });
  });

  it('maps task fields into the eleven Daily Outcome Updates columns', () => {
    const [row] = buildDailyOutcomeRows([{
      title: 'Coates Estates Pty Ltd',
      description: '2026 Income Tax Return',
      outcomeAchieved: ['Prepare Draft WPP', 'Query sent to manager'],
      assignDate: '2026-07-02',
      deadline: '2026-07-10',
      completionDate: '2026-07-12T08:00:00.000Z',
      status: 'Lodged/Completed',
      notes: 'Issues / Roadblocks: Missing information',
    }]);

    expect(row).toEqual({
      client: 'Coates Estates Pty Ltd',
      task: '2026 Income Tax Return',
      outcomes: '+ Prepare Draft WPP\n+ Query sent to manager',
      assignDate: '2026-07-02',
      deadline: '2026-07-10',
      completionDate: '2026-07-12T08:00:00.000Z',
      status: 'Lodged/Completed',
      timeSpent: '',
      issues: 'Missing information',
      communication: '',
      evidence: '',
    });
  });
});

describe('Daily Outcome Updates worksheet', () => {
  const templateWorksheet = `<worksheet><dimension ref="A1:K20"/><sheetViews><sheetView><selection activeCell="B14" sqref="B14"/></sheetView></sheetViews><sheetData><row r="5"><c r="B5" s="32"><v>46194</v></c></row><row r="10"><c r="A10" s="44"/></row><row r="14"><c r="A14" s="33"/></row><row r="17"><c r="A17" s="45"/></row><row r="19"><c r="A19" s="10"/></row><row r="20"><c r="A20" s="19"><v>old value</v></c><c r="B20" s="20"/><c r="C20" s="21"/><c r="D20" s="15"/><c r="E20" s="23"/><c r="F20" s="23"/><c r="G20" s="16"/><c r="H20" s="2"/><c r="I20" s="21"/><c r="J20" s="2"/><c r="K20" s="17"/></row></sheetData><mergeCells count="3"><mergeCell ref="A1:K2"/><mergeCell ref="A10:K10"/><mergeCell ref="A17:K17"/></mergeCells><autoFilter ref="A19:K20"/></worksheet>`;

  it('removes rows 10–14, moves the table up, and sets B5 to the export date', () => {
    const { xml } = updateDailyOutcomeWorksheet(templateWorksheet, [{
      client: 'Example client', task: '', outcomes: '', assignDate: '', deadline: '', completionDate: '', status: '', timeSpent: '', issues: '', communication: '', evidence: '',
    }], new Date(2026, 7, 12));

    expect(xml).toContain('<c r="B5" s="32"><v>46246</v></c>');
    expect(xml).not.toContain('<row r="10"><c r="A10" s="44"/></row>');
    expect(xml).toContain('<row r="12"><c r="A12" s="45"/></row>');
    expect(xml).toContain('<row r="14"><c r="A14" s="10"/></row>');
    expect(xml).toContain('<c r="A15" s="19" t="inlineStr"><is><t>Example client</t></is></c>');
    expect(xml).not.toContain('ref="A10:K10"');
    expect(xml).toContain('ref="A12:K12"');
    expect(xml).toContain('<autoFilter ref="A14:K15"/>');
  });
});

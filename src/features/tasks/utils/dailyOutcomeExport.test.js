import { buildDailyOutcomeRows, splitDailyOutcomeNotes } from './dailyOutcomeExport';

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

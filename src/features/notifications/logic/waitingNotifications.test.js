import { getOverdueWaitingNotifications, getWaitingEnteredAt } from './waitingNotifications';

describe('waiting notifications', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts an imported waiting task from its import time, not its assign date', () => {
    const importedAt = '2026-07-20T09:00:00.000Z';
    const task = {
      _id: 'imported-waiting-task',
      status: 'Waiting client',
      assignDate: '2026-01-01',
      statusHistory: [{ status: 'Waiting client', changedAt: importedAt }],
    };

    jest.useFakeTimers().setSystemTime(new Date('2026-07-26T09:00:00.000Z'));

    expect(getWaitingEnteredAt(task)).toBe(importedAt);
    expect(getOverdueWaitingNotifications([task])).toEqual([]);
  });

  it('uses the most recent waiting status history entry', () => {
    const task = {
      _id: 'waiting-status-history',
      status: 'Waiting for review',
      statusHistory: [
        { status: 'Sent query for Manager', changedAt: '2026-07-13T12:29:42.714Z' },
        { status: 'Waiting client', changedAt: '2026-07-18T14:06:00.482Z' },
        { status: 'In Progress', changedAt: '2026-07-20T04:44:37.723Z' },
        { status: 'Waiting for review', changedAt: '2026-07-20T05:10:56.694Z' },
      ],
    };

    expect(getWaitingEnteredAt(task)).toBe('2026-07-20T05:10:56.694Z');
  });
});

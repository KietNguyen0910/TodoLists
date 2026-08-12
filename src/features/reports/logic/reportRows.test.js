import { buildActivityRows, buildJobRows } from './reportRows';

const reportRange = ['2026-08-01', '2026-08-31'];

function createTask({ id, title, deleted = false, isDeleted = false }) {
  return {
    _id: id,
    title,
    description: '2026 Income Tax Return',
    status: 'In Progress',
    deleted,
    isDeleted,
    auditLogs: [{
      action: 'updated',
      changedAt: '2026-08-12T10:00:00.000Z',
      changes: [{ field: 'status', label: 'Status', previous: 'Waiting client', next: 'In Progress' }],
    }],
  };
}

describe('report rows', () => {
  const tasks = [
    createTask({ id: 'active', title: 'Active client' }),
    createTask({ id: 'deleted', title: 'Deleted client', deleted: true }),
    createTask({ id: 'legacy-deleted', title: 'Legacy deleted client', isDeleted: true }),
  ];

  it('excludes deleted tasks from the Activities report', () => {
    expect(buildActivityRows(tasks, ...reportRange).map((row) => row.client)).toEqual(['Active client']);
  });

  it('excludes deleted tasks from the Jobs report', () => {
    expect(buildJobRows(tasks, ...reportRange).map((row) => row.client)).toEqual(['Active client']);
  });

  it('excludes deletion audit logs from a task that was later restored', () => {
    const restoredTask = createTask({ id: 'restored', title: 'Restored client' });
    restoredTask.auditLogs.push({
      action: 'deleted',
      changedAt: '2026-08-12T12:00:00.000Z',
      changes: [{ field: 'deleted', label: 'Deleted', from: false, to: true }],
    });

    expect(buildActivityRows([restoredTask], ...reportRange)).toHaveLength(1);
    expect(buildActivityRows([restoredTask], ...reportRange)[0].action).toBe('Updated Task');
    expect(buildJobRows([restoredTask], ...reportRange)[0].detail).not.toContain('Deleted Task');
  });
});

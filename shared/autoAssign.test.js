const { createAutoAssignLog, selectAutomaticAssignments } = require('./autoAssign');

describe('automatic In Progress assignment', () => {
  it('fills available slots with the oldest assigned Initial tasks', () => {
    const tasks = [
      { _id: 'progress-1', status: 'In Progress' },
      { _id: 'progress-2', status: 'In Progress' },
      { _id: 'initial-new', status: 'Initial Information Received', assignDate: '2026-07-10', createdAt: '2026-07-01' },
      { _id: 'initial-old', status: 'Initial Information Received', assignDate: '2026-07-01', createdAt: '2026-07-02' },
      { _id: 'initial-no-date', status: 'Initial Information Received', assignDate: '', createdAt: '2026-06-01' },
    ];

    expect(selectAutomaticAssignments(tasks).map((task) => task._id)).toEqual(['initial-old', 'initial-new']);
  });

  it('does not assign when four or more active tasks are already In Progress', () => {
    const tasks = [
      ...Array.from({ length: 4 }, (_, index) => ({ _id: `progress-${index}`, status: 'In Progress' })),
      { _id: 'initial', status: 'Initial Information Received', assignDate: '2026-07-01' },
    ];

    expect(selectAutomaticAssignments(tasks)).toEqual([]);
  });

  it('uses creation time as the tie-breaker and accepts legacy display dates', () => {
    const tasks = [
      { _id: 'created-later', status: 'Initial Information Received', assignDate: '01/07/2026', createdAt: '2026-06-02' },
      { _id: 'created-first', status: 'Initial Information Received', assignDate: '2026-07-01', createdAt: '2026-06-01' },
    ];

    expect(selectAutomaticAssignments(tasks).map((task) => task._id)).toEqual(['created-first', 'created-later']);
  });

  it('ignores deleted In Progress tasks and records the automatic status change', () => {
    const tasks = [
      { _id: 'deleted-progress', status: 'In Progress', deleted: true },
      { _id: 'initial', status: 'Initial Information Received', assignDate: '2026-07-01' },
    ];
    const changedAt = new Date('2026-07-18T09:00:00Z');

    expect(selectAutomaticAssignments(tasks).map((task) => task._id)).toEqual(['initial']);
    expect(createAutoAssignLog(tasks[1], changedAt)).toMatchObject({
      action: 'auto-assigned',
      actor: 'Automatic assignment',
      changedAt,
      changes: [{ field: 'status', from: 'Initial Information Received', to: 'In Progress' }],
    });
  });
});

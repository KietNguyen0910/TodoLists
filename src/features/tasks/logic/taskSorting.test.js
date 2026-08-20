import { getDefaultTaskSortMode, getNextAssignDateSortMode, sortTasksForTab, TASK_SORT_MODES } from './taskSorting';

describe('task sorting', () => {
  const tasks = [
    { _id: 'hold', title: 'Zeta Client', description: 'B Task', status: 'On hold', assignDate: '2026-06-18' },
    { _id: 'progress-old', title: 'Beta Client', description: 'C Task', status: 'In Progress', assignDate: '2026-06-10' },
    { _id: 'initial', title: 'Alpha Client', description: 'A Task', status: 'Initial Information Received', assignDate: '2026-06-20' },
    { _id: 'progress-new', title: 'Gamma Client', description: 'D Task', status: 'In Progress', assignDate: '2026-06-25' },
  ];

  it('defaults normal task tabs to grouping by status with In Progress first', () => {
    expect(getDefaultTaskSortMode('todo')).toBe(TASK_SORT_MODES.STATUS);
    expect(sortTasksForTab(tasks, 'todo').map((task) => task._id)).toEqual([
      'progress-old',
      'progress-new',
      'initial',
      'hold',
    ]);
  });

  it('sorts by assign date in both directions', () => {
    expect(sortTasksForTab(tasks, 'todo', TASK_SORT_MODES.DATE_ASC).map((task) => task._id)).toEqual([
      'progress-old',
      'hold',
      'initial',
      'progress-new',
    ]);
    expect(sortTasksForTab(tasks, 'todo', TASK_SORT_MODES.DATE_DESC).map((task) => task._id)).toEqual([
      'progress-new',
      'initial',
      'hold',
      'progress-old',
    ]);
  });

  it('toggles the assign-date sort direction from the column action', () => {
    expect(getNextAssignDateSortMode(TASK_SORT_MODES.STATUS)).toBe(TASK_SORT_MODES.DATE_ASC);
    expect(getNextAssignDateSortMode(TASK_SORT_MODES.DATE_ASC)).toBe(TASK_SORT_MODES.DATE_DESC);
    expect(getNextAssignDateSortMode(TASK_SORT_MODES.DATE_DESC)).toBe(TASK_SORT_MODES.DATE_ASC);
  });

  it('sorts completed tasks by the latest completed status change by default', () => {
    const completedTasks = [
      { _id: 'older', status: 'Lodged/Completed', completionDate: '2026-06-10', statusHistory: [{ status: 'Lodged/Completed', changedAt: '2026-06-10T09:00:00' }] },
      { _id: 'newer', status: 'Lodged/Completed', completionDate: '2026-06-12', statusHistory: [{ status: 'Lodged/Completed', changedAt: '2026-06-15T09:00:00' }] },
    ];

    expect(getDefaultTaskSortMode('completed')).toBe(TASK_SORT_MODES.DATE_DESC);
    expect(sortTasksForTab(completedTasks, 'completed').map((task) => task._id)).toEqual(['newer', 'older']);
  });

  it('sorts Sent Report to Client tasks by their latest Sent Report status change', () => {
    const sentReportTasks = [
      { _id: 'older', status: 'Sent Report to client', assignDate: '2026-06-20', statusHistory: [{ status: 'Sent Report to client', changedAt: '2026-06-11T09:00:00' }] },
      { _id: 'newer', status: 'Sent Report to client', assignDate: '2026-06-10', statusHistory: [{ status: 'Sent Report to client', changedAt: '2026-06-15T09:00:00' }, { status: 'Sent Report to client', changedAt: '2026-06-16T09:00:00' }] },
      { _id: 'not-sent', status: 'Out To Sign', assignDate: '2026-06-01', statusHistory: [{ status: 'Out To Sign', changedAt: '2026-06-18T09:00:00' }] },
    ];

    expect(getDefaultTaskSortMode('out-to-sign')).toBe(TASK_SORT_MODES.SENT_REPORT_DATE_DESC);
    expect(sortTasksForTab(sentReportTasks, 'out-to-sign').map((task) => task._id)).toEqual(['newer', 'older', 'not-sent']);
  });

  it('keeps automatic assignments at the end of the In Progress group', () => {
    const tasksWithAutomaticAssignment = [
      { _id: 'auto-progress', status: 'In Progress', assignDate: '2026-06-01', auditLogs: [{ action: 'auto-assigned' }] },
      { _id: 'manual-progress', status: 'In Progress', assignDate: '2026-06-20' },
      { _id: 'initial', status: 'Initial Information Received', assignDate: '2026-06-10' },
    ];

    expect(sortTasksForTab(tasksWithAutomaticAssignment, 'todo').map((task) => task._id)).toEqual([
      'manual-progress',
      'auto-progress',
      'initial',
    ]);
  });
});

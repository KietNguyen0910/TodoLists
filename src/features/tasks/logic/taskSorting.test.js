import { getDefaultTaskSortMode, sortTasksForTab, TASK_SORT_MODES } from './taskSorting';

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

  it('sorts completed tasks by the latest completed status change by default', () => {
    const completedTasks = [
      { _id: 'older', status: 'Lodged/Completed', completionDate: '2026-06-10', statusHistory: [{ status: 'Lodged/Completed', changedAt: '2026-06-10T09:00:00' }] },
      { _id: 'newer', status: 'Lodged/Completed', completionDate: '2026-06-12', statusHistory: [{ status: 'Lodged/Completed', changedAt: '2026-06-15T09:00:00' }] },
    ];

    expect(getDefaultTaskSortMode('completed')).toBe(TASK_SORT_MODES.DATE_DESC);
    expect(sortTasksForTab(completedTasks, 'completed').map((task) => task._id)).toEqual(['newer', 'older']);
  });
});

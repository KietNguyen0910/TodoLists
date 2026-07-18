import { TASK_TABS, WAITING_STATUSES } from '../../../app/tabs.config';
import { getTaskTabId, getTasksForTab } from './taskFilters';

describe('task tab filtering', () => {
  it('places each waiting status in its new tab', () => {
    expect(getTaskTabId('Waiting client')).toBe('waiting-information-request');
    expect(getTaskTabId('Sent query for Manager')).toBe('waiting-information-request');
    expect(getTaskTabId('Waiting for review')).toBe('waiting-review');
  });

  it('separates Initial Information Received from the In Progress tab', () => {
    expect(getTaskTabId('Initial Information Received')).toBe('information-received');
    expect(getTaskTabId('In Progress')).toBe('todo');
    expect(getTaskTabId('On hold')).toBe('todo');
  });

  it('keeps all waiting statuses in the notification set', () => {
    expect(WAITING_STATUSES).toEqual(new Set([
      'Waiting client',
      'Sent query for Manager',
      'Waiting for review',
    ]));
  });

  it('filters a tab to only its configured statuses', () => {
    const informationTab = TASK_TABS.find((tab) => tab.id === 'waiting-information-request');
    const tasks = [
      { _id: 'client', status: 'Waiting client' },
      { _id: 'query', status: 'Sent query for Manager' },
      { _id: 'review', status: 'Waiting for review' },
    ];

    expect(getTasksForTab(tasks, informationTab).map((task) => task._id)).toEqual(['client', 'query']);
  });
});

import { TASK_TABS, WAITING_STATUSES } from '../../../app/tabs.config';
import { getTaskTabId, getTasksForTab, isActiveTask } from './taskFilters';

describe('task tab filtering', () => {
  it('places each waiting status in its new tab', () => {
    expect(getTaskTabId('Waiting client')).toBe('waiting-information-request');
    expect(getTaskTabId('Sent query for Manager')).toBe('waiting-information-request');
    expect(getTaskTabId('Waiting for final Review')).toBe('waiting-review');
    expect(getTaskTabId('Waiting for review')).toBe('waiting-review');
  });

  it('separates Initial Information Received from the In Progress tab', () => {
    expect(getTaskTabId('Initial Information Received')).toBe('information-received');
    expect(getTaskTabId('In Progress')).toBe('todo');
    expect(getTaskTabId('On hold')).toBe('todo');
    expect(getTaskTabId('Sent Report to client')).toBe('out-to-sign');
  });

  it('uses the requested sidebar labels for Sent Report to Client and Signed', () => {
    expect(getTaskTabId('Out To Sign')).toBe('out-to-sign');
    expect(getTaskTabId('Singed')).toBe('singed');
    expect(TASK_TABS.slice(-3).map((tab) => tab.id)).toEqual(['completed', 'out-to-sign', 'singed']);
    expect(TASK_TABS.find((tab) => tab.id === 'out-to-sign')).toMatchObject({
      label: 'Sent Report to Client',
      title: 'Sent Report to Client',
      statuses: ['Out To Sign', 'Sent Report to client'],
    });
    expect(TASK_TABS.find((tab) => tab.id === 'singed')).toMatchObject({ label: 'Signed', title: 'Signed' });
  });

  it('keeps all waiting statuses in the notification set', () => {
    expect(WAITING_STATUSES).toEqual(new Set([
      'Waiting client',
      'Sent query for Manager',
      'Waiting for final Review',
      'Waiting for review',
    ]));
  });

  it('excludes both soft-delete flags from the active task list', () => {
    expect(isActiveTask({ deleted: true })).toBe(false);
    expect(isActiveTask({ isDeleted: true })).toBe(false);
    expect(isActiveTask({ deleted: false, isDeleted: false })).toBe(true);
  });

  it('filters a tab to only its configured statuses', () => {
    const informationTab = TASK_TABS.find((tab) => tab.id === 'waiting-information-request');
    const tasks = [
      { _id: 'client', status: 'Waiting client' },
      { _id: 'query', status: 'Sent query for Manager' },
      { _id: 'review', status: 'Waiting for final Review' },
    ];

    expect(getTasksForTab(tasks, informationTab).map((task) => task._id)).toEqual(['client', 'query']);
  });
});

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import TaskHistoryModal, { getVisibleHistoryLogs } from './TaskHistoryModal';

describe('TaskHistoryModal', () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('does not display delete audit entries in the task history popup', () => {
    const logs = getVisibleHistoryLogs([
      { action: 'updated', changedAt: '2026-07-21T09:00:00Z', changes: [{ field: 'software', label: 'Software', to: 'Xero' }] },
      { action: 'deleted', changedAt: '2026-07-20T11:38:00Z', changes: [{ field: 'deleted', label: 'Deleted', to: true }] },
      { action: 'updated', changedAt: '2026-07-20T11:37:00Z', changes: [{ field: 'isDeleted', label: 'Deleted', to: true }] },
    ]);

    expect(logs).toEqual([
      expect.objectContaining({ action: 'updated', changedAt: '2026-07-21T09:00:00Z' }),
    ]);
  });

  it('adds a history title to Note when its item is double-clicked', () => {
    const onAddToNote = jest.fn();
    const task = {
      title: 'Acme',
      auditLogs: [{ action: 'updated', changedAt: '2026-07-21T09:00:00Z', changes: [{ field: 'software', label: 'Software', to: 'Xero' }] }],
    };

    act(() => root.render(<TaskHistoryModal isOpen task={task} onClose={jest.fn()} onAddToNote={onAddToNote} />));
    act(() => container.querySelector('.history-summary').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));

    expect(onAddToNote).toHaveBeenCalledWith(task, 'Updated Task (Software)');
  });
});

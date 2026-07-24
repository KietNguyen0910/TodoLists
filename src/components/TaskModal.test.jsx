import { act } from 'react';
import { createRoot } from 'react-dom/client';
import TaskModal from './TaskModal';

describe('TaskModal', () => {
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

  it.each(['create', 'edit'])('does not show Deadline in %s mode', (mode) => {
    act(() => root.render(
      <TaskModal
        isOpen
        mode={mode}
        initialValues={mode === 'edit' ? { title: 'Acme', deadline: '2026-07-10' } : undefined}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    ));

    expect(container.querySelector('[aria-label="Deadline"]')).toBeNull();
    expect(container.textContent).not.toContain('Deadline');
  });
});

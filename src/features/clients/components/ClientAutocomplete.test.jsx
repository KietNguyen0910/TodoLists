import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ClientAutocomplete from './ClientAutocomplete';

const clientProfiles = [
  { key: 'coastal accounting', name: 'Coastal Accounting' },
  { key: 'coast pty ltd', name: 'Coast Pty Ltd' },
  { key: 'paper coast', name: 'Paper Coast' },
];

function ClientAutocompleteHarness({ onSelect }) {
  const [value, setValue] = useState('');
  return <ClientAutocomplete clientProfiles={clientProfiles} value={value} onChange={setValue} onSelect={onSelect} />;
}

function setInputValue(input, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  valueSetter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ClientAutocomplete', () => {
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

  it('filters suggestions, selects by click and closes when clicking outside', () => {
    const onSelect = jest.fn();
    act(() => root.render(<ClientAutocompleteHarness onSelect={onSelect} />));
    const input = container.querySelector('input');

    act(() => setInputValue(input, 'coast'));
    expect([...container.querySelectorAll('[role="option"]')].map((option) => option.textContent)).toEqual([
      'Coastal Accounting',
      'Coast Pty Ltd',
      'Paper Coast',
    ]);

    act(() => container.querySelectorAll('[role="option"]')[1].click());
    expect(onSelect).toHaveBeenCalledWith(clientProfiles[1]);
    expect(container.querySelector('[role="listbox"]')).toBeNull();

    act(() => setInputValue(input, 'fg'));
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');

    act(() => setInputValue(input, 'paper'));
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
    act(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('supports arrow navigation, Enter and Escape', () => {
    const onSelect = jest.fn();
    act(() => root.render(<ClientAutocompleteHarness onSelect={onSelect} />));
    const input = container.querySelector('input');

    act(() => setInputValue(input, 'coast'));
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(onSelect).toHaveBeenCalledWith(clientProfiles[1]);

    act(() => setInputValue(input, 'coast'));
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });
});

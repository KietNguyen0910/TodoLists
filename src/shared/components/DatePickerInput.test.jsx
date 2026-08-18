import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import DatePickerInput from './DatePickerInput';

function DateRangeHarness() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [toDateOpenSignal, setToDateOpenSignal] = useState(0);

  return (
    <>
      <DatePickerInput
        ariaLabel="From date"
        value={fromDate}
        onChange={(nextFromDate) => {
          setFromDate(nextFromDate);
          setToDateOpenSignal((current) => current + 1);
        }}
      />
      <DatePickerInput
        ariaLabel="To date"
        value={toDate}
        onChange={setToDate}
        openSignal={toDateOpenSignal}
        viewDateOnOpen={fromDate}
      />
    </>
  );
}

describe('DatePickerInput automatic opening', () => {
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

  it('keeps the selected From date while opening the To date picker', () => {
    act(() => root.render(<DateRangeHarness />));

    const fromInput = container.querySelector('[aria-label="From date"]');
    act(() => fromInput.focus());

    const fromPicker = container.querySelector('.date-picker');
    const day = Array.from(fromPicker.querySelectorAll('.date-picker-day')).find((button) => button.textContent === '19');
    act(() => day.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(fromInput.value).not.toBe('');
    expect(container.querySelector('[aria-label="To date"]').value).toBe('');
    expect(container.querySelectorAll('.date-picker-popup')).toHaveLength(1);
  });
});

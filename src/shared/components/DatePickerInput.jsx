import { useEffect, useMemo, useRef, useState } from 'react';

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const DISPLAY_FORMATTER = new Intl.DateTimeFormat('en-GB');
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function parseInputDate(value) {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function createValidatedDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function parseTypedDate(value) {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const displayMatch = normalizedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const compactMatch = normalizedValue.match(/^(\d{2})(\d{2})(\d{2}|\d{4})$/);
  const [, year, month, day] = isoMatch || [];
  const [, displayDay, displayMonth, displayYear] = displayMatch || [];
  const [, compactDay, compactMonth, compactYear] = compactMatch || [];

  return isoMatch
    ? createValidatedDate(Number(year), Number(month), Number(day))
    : displayMatch
      ? createValidatedDate(Number(displayYear), Number(displayMonth), Number(displayDay))
      : compactMatch
        ? createValidatedDate(Number(compactYear.length === 2 ? `20${compactYear}` : compactYear), Number(compactMonth), Number(compactDay))
      : undefined;
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(first, second) {
  return first && second
    && first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

export default function DatePickerInput({ value, onChange, placeholder = 'dd/mm/yyyy', name, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseInputDate(value) || new Date());
  const [inputValue, setInputValue] = useState(() => {
    const date = parseInputDate(value);
    return date ? DISPLAY_FORMATTER.format(date) : '';
  });
  const wrapperRef = useRef(null);
  const selectedDate = parseInputDate(value);
  const today = new Date();

  useEffect(() => {
    const date = parseInputDate(value);
    setInputValue(date ? DISPLAY_FORMATTER.format(date) : '');
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: leadingDays + daysInMonth }, (_, index) => (
      index < leadingDays ? null : new Date(year, month, index - leadingDays + 1)
    ));
  }, [viewDate]);

  const openCalendar = () => {
    setViewDate(selectedDate || new Date());
    setIsOpen(true);
  };

  const selectDate = (date) => {
    onChange(formatInputDate(date));
    setIsOpen(false);
  };

  const commitTypedDate = () => {
    const typedDate = parseTypedDate(inputValue);
    if (typedDate === null) {
      onChange('');
      setIsOpen(false);
      return;
    }
    if (typedDate) {
      selectDate(typedDate);
      return;
    }

    setInputValue(selectedDate ? DISPLAY_FORMATTER.format(selectedDate) : '');
    setIsOpen(false);
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);

    if (!/^\d{6}(?:\d{2})?$/.test(nextValue)) return;

    const compactDate = parseTypedDate(nextValue);
    if (!compactDate) return;

    setInputValue(DISPLAY_FORMATTER.format(compactDate));
    selectDate(compactDate);
  };

  return (
    <div className="date-picker" ref={wrapperRef}>
      <input
        className="date-picker-input"
        type="text"
        name={name}
        value={inputValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onChange={handleInputChange}
        onClick={openCalendar}
        onFocus={openCalendar}
        onBlur={commitTypedDate}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitTypedDate();
          }
          if (event.key === 'Escape') {
            setInputValue(selectedDate ? DISPLAY_FORMATTER.format(selectedDate) : '');
            setIsOpen(false);
          }
        }}
      />
      <button className="date-picker-toggle" type="button" aria-label={`Open ${ariaLabel || 'date picker'}`} onClick={openCalendar}>&#128197;</button>
      {isOpen && (
        <div className="date-picker-popup" role="dialog" aria-label={ariaLabel || 'Choose date'} onMouseDown={(event) => event.preventDefault()}>
          <div className="date-picker-header">
            <button type="button" aria-label="Previous month" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>&lsaquo;</button>
            <strong>{MONTH_FORMATTER.format(viewDate)}</strong>
            <button type="button" aria-label="Next month" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>&rsaquo;</button>
          </div>
          <div className="date-picker-weekdays">{WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
          <div className="date-picker-days">
            {days.map((date, index) => date ? (
              <button
                className={`date-picker-day ${isSameDay(date, selectedDate) ? 'is-selected' : ''} ${isSameDay(date, today) ? 'is-today' : ''}`}
                type="button"
                key={formatInputDate(date)}
                onClick={() => selectDate(date)}
              >
                {date.getDate()}
              </button>
            ) : <span key={`blank-${index}`} />)}
          </div>
          <div className="date-picker-actions">
            <button type="button" onClick={() => { onChange(''); setIsOpen(false); }}>Clear</button>
            <button type="button" onClick={() => selectDate(today)}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

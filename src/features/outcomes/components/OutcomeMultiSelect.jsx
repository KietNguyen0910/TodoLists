import { useEffect, useRef, useState } from 'react';
import { filterOptionGroups, normalizeOptionGroups } from '../logic/outcomeOptions';

export default function OutcomeMultiSelect({ options, value = [], progressLabel = '', onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const optionGroups = normalizeOptionGroups(options);
  const filteredGroups = filterOptionGroups(optionGroups, searchTerm);
  const filteredOptions = filteredGroups.flatMap((group) => group.items);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
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

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      return undefined;
    }

    setHighlightedIndex(0);
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [searchTerm, filteredOptions.length]);

  useEffect(() => {
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const toggleOption = (option) => {
    onChange(selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]);
  };

  const handleMenuKeyDown = (event) => {
    if (event.target.tagName === 'BUTTON' || filteredOptions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((index) => (index + 1) % filteredOptions.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => (index <= 0 ? filteredOptions.length - 1 : index - 1));
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      toggleOption(filteredOptions[highlightedIndex]);
    }
  };

  return (
    <div className="outcome-select" ref={containerRef}>
      <button
        className="flex flex-col justify-start outcome-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <div className="flex justify-between w-full gap-1">
          <span>{selected.length ? `${selected.length} outcome${selected.length > 1 ? 's' : ''} selected - ${progressLabel}` : 'Select outcomes'}</span>
          <span aria-hidden="true">v</span>
        </div>
      </button>
      {isOpen && (
        <div className="outcome-select-menu" role="listbox" aria-multiselectable="true" onKeyDown={handleMenuKeyDown}>
          <input
            ref={searchInputRef}
            className="outcome-search-input"
            type="search"
            placeholder="Search outcomes..."
            value={searchTerm}
            aria-activedescendant={highlightedIndex >= 0 ? `outcome-option-${highlightedIndex}` : undefined}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <div className="outcome-select-menu-header">
            <span>Select one or more outcomes</span>
            {selected.length > 0 && <button type="button" onClick={() => onChange([])}>Clear</button>}
          </div>
          {filteredOptions.length === 0 && <p className="outcome-empty">No outcomes found</p>}
          {filteredGroups.map((group) => {
            let groupStartIndex = 0;
            for (const previousGroup of filteredGroups) {
              if (previousGroup.key === group.key) break;
              groupStartIndex += previousGroup.items.length;
            }

            return (
              <div className="outcome-phase-group" key={group.key}>
                {group.title && <div className="outcome-phase-title">{group.title}</div>}
                {group.items.map((option, optionIndex) => {
                  const index = groupStartIndex + optionIndex;

                  return (
                    <label
                      ref={(element) => { optionRefs.current[index] = element; }}
                      id={`outcome-option-${index}`}
                      className={`outcome-option${index === highlightedIndex ? ' is-active' : ''}`}
                      key={option}
                      role="option"
                      aria-selected={selected.includes(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <input type="checkbox" checked={selected.includes(option)} onChange={() => toggleOption(option)} />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      {selected.length > 0 && !isOpen && (
        <ul className="outcome-selected-list" aria-label="Selected outcomes">
          <li className="outcome-progress-label">{progressLabel}</li>
          {selected.map((option) => <li className="font-semibold text-left text-black" key={option}>+ {option}</li>)}
        </ul>
      )}
    </div>
  );
}

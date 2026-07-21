import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getClientSuggestions } from '../logic/softwareSync';

export default function ClientAutocomplete({ clientProfiles, disabled = false, value, onChange, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const listboxId = useId();
  const suggestions = useMemo(() => getClientSuggestions(clientProfiles, value), [clientProfiles, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    if (activeIndex >= suggestions.length) setActiveIndex(0);
  }, [activeIndex, suggestions.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectClient = (client) => {
    onSelect(client);
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (!suggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (isOpen ? (current + 1) % suggestions.length : 0));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (isOpen ? (current - 1 + suggestions.length) % suggestions.length : suggestions.length - 1));
    }
    if (event.key === 'Enter' && isOpen) {
      event.preventDefault();
      selectClient(suggestions[activeIndex]);
    }
  };

  const isExpanded = isOpen && Boolean(value.trim()) && suggestions.length > 0;
  return (
    <div className="task-client-autocomplete" ref={wrapperRef}>
      <input
        name="title"
        value={value}
        required
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={isExpanded ? listboxId : undefined}
        aria-expanded={isExpanded}
        aria-activedescendant={isExpanded && suggestions.length ? `${listboxId}-option-${activeIndex}` : undefined}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(Boolean(event.target.value.trim()));
        }}
        onFocus={() => setIsOpen(Boolean(value.trim()))}
        onKeyDown={handleKeyDown}
      />
      {isExpanded && (
        <div className="task-client-autocomplete-panel" id={listboxId} role="listbox" aria-label="Existing clients">
          {suggestions.map((client, index) => (
            <button
              key={client.key}
              id={`${listboxId}-option-${index}`}
              className={`task-client-autocomplete-option ${index === activeIndex ? 'is-active' : ''}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectClient(client)}
            >
              {client.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

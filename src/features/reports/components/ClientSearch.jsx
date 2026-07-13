import { useEffect, useMemo, useRef, useState } from 'react';

const getClientNames = (tasks) => Array.from(new Set(
  tasks
    .filter((task) => !(task.deleted || task.isDeleted))
    .map((task) => (task.title || '').trim())
    .filter(Boolean),
)).sort((first, second) => first.localeCompare(second));

export default function ClientSearch({ tasks, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const clients = useMemo(() => getClientNames(tasks), [tasks]);
  const suggestions = useMemo(() => {
    const keyword = value.trim().toLocaleLowerCase();

    if (!keyword) return [];

    return clients
      .filter((client) => client.toLocaleLowerCase().includes(keyword))
      .slice(0, 8);
  }, [clients, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    if (activeIndex >= suggestions.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, suggestions.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectClient = (client) => {
    onChange(client);
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (!isOpen || !suggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectClient(suggestions[activeIndex]);
    }
  };

  return (
    <div className="report-client-search" ref={wrapperRef}>
      <input
        type="search"
        placeholder="Search by client..."
        value={value}
        aria-label="Search client"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(Boolean(event.target.value.trim()));
        }}
        onFocus={() => setIsOpen(Boolean(value.trim()))}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="report-client-search-panel" role="listbox">
          {suggestions.length ? (
            suggestions.map((client, index) => (
              <button
                key={client}
                className={`report-client-search-item ${index === activeIndex ? 'is-active' : ''}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectClient(client)}
              >
                {client}
              </button>
            ))
          ) : (
            <p className="report-client-search-empty">No matching clients found.</p>
          )}
        </div>
      )}
    </div>
  );
}

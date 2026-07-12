import { useEffect, useMemo, useRef, useState } from 'react';
import { formatTaskMeta, searchTasks } from '../logic/searchTasks';

export default function GlobalSearch({ tasks, onSelect }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);

  const results = useMemo(() => searchTasks(tasks, query), [query, tasks]);

  useEffect(() => {
    setActiveIndex(0);
    setIsOpen(Boolean(query.trim()));
  }, [query]);

  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, results.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectTask = (task) => {
    onSelect(task);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (!isOpen || !results.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (results[activeIndex]) {
        selectTask(results[activeIndex]);
      }
    }
  };

  return (
    <div className="global-search min-w-[20rem]" ref={wrapperRef}>
      <input
        type="search"
        value={query}
        placeholder="Search client or task..."
        aria-label="Search client or task"
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(Boolean(query.trim()))}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="global-search-panel" role="listbox">
          {results.length ? (
            results.map((task, index) => (
              <button
                key={task._id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`global-search-item ${index === activeIndex ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectTask(task)}
              >
                <span className="global-search-title">{task.title || '_'}</span>
                <span className="global-search-description">{task.description || '_'}</span>
                <span className="global-search-meta">{formatTaskMeta(task)}</span>
              </button>
            ))
          ) : (
            <p className="global-search-empty">No matching tasks found.</p>
          )}
        </div>
      )}
    </div>
  );
}

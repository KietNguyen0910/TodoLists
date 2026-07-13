import { useState } from 'react';

export default function TagInput({ value = [], onChange, placeholder = 'Type and press Enter', disabled = false }) {
  const [draft, setDraft] = useState('');
  const tags = Array.isArray(value) ? value : [];

  const addTag = () => {
    const nextTag = draft.trim();
    if (!nextTag) return;

    if (!tags.some((tag) => tag.toLocaleLowerCase() === nextTag.toLocaleLowerCase())) {
      onChange([...tags, nextTag]);
    }
    setDraft('');
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    addTag();
  };

  return (
    <div className="tag-input" onClick={(event) => event.currentTarget.querySelector('input')?.focus()}>
      {tags.map((tag) => (
        <span className="tag-input-item" key={tag}>
          {tag}
          <button
            type="button"
            className="tag-input-remove"
            aria-label={`Remove ${tag}`}
            disabled={disabled}
            onClick={() => onChange(tags.filter((item) => item !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        disabled={disabled}
        placeholder={tags.length ? '' : placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
      />
    </div>
  );
}

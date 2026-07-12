import { useState } from 'react';

export default function LoginModal({ isOpen, onClose, onSubmit, isSubmitting = false, error = '' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isSubmitting) onSubmit(username, password);
  };
  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) onClose();
  };

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={handleOverlayClick}>
      <div className="modal-card login-modal-card" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div className="modal-header">
          <h2 id="login-title">Login</h2>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose} disabled={isSubmitting}>x</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <p className="error" role="alert">{error}</p>}
          <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label>
          <label>
            Password
            <span className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
                disabled={isSubmitting}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </span>
          </label>
          <div className="modal-actions">
            <button type="button" className="button-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="button-primary button-loading" disabled={isSubmitting}>
              {isSubmitting && <span className="loading-spinner" aria-hidden="true" />}
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

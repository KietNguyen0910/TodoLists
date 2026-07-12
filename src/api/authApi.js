import { API_BASE_URL } from './httpClient';
import { saveStoredAuth } from '../features/auth/utils/authStorage';

const AUTH_URL = `${API_BASE_URL}/api/auth/login`;

export async function login(username, password) {
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Unable to login.');
  }

  const auth = await response.json();
  saveStoredAuth(auth);
  return auth;
}

import { clearStoredAuth, getStoredAuth } from '../features/auth/utils/authStorage';

export const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

export async function apiRequest(url, options = {}) {
  const auth = getStoredAuth();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) clearStoredAuth();

    const error = new Error(data.message || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

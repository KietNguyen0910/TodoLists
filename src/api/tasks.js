const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
const TASKS_URL = `${API_BASE_URL}/api/tasks`;
const AUTH_URL = `${API_BASE_URL}/api/auth/login`;
const AUTH_STORAGE_KEY = 'todoApp.auth';

export function getStoredAuth() {
  try {
    const value = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const auth = JSON.parse(value || 'null');
    return auth?.token ? auth : null;
  } catch {
    return null;
  }
}

export function saveStoredAuth(auth) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function request(path = '', options = {}) {
  const auth = getStoredAuth();
  const response = await fetch(`${TASKS_URL}${path}`, {
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

export function getTasks() {
  return request();
}

export function createTask(task) {
  return request('', { method: 'POST', body: JSON.stringify(task) });
}

export function updateTask(taskId, changes) {
  return request(`/${taskId}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

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

export const AUTH_STORAGE_KEY = 'todoApp.auth';

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

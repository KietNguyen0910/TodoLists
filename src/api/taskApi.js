import { API_BASE_URL, apiRequest } from './httpClient';

const TASKS_URL = `${API_BASE_URL}/api/tasks`;

export function getTasks() {
  return apiRequest(TASKS_URL);
}

export function createTask(task) {
  return apiRequest(TASKS_URL, { method: 'POST', body: JSON.stringify(task) });
}

export function updateTask(taskId, changes) {
  return apiRequest(`${TASKS_URL}/${taskId}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

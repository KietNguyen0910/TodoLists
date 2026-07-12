const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
const TASKS_URL = `${API_BASE_URL}/api/tasks`;

async function request(path = '', options = {}) {
  const response = await fetch(`${TASKS_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'The request could not be completed.');
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

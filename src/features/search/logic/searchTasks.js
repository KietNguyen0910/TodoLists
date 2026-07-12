export function searchTasks(tasks, query, limit = 10) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];

  return tasks
    .filter((task) => `${task.title || ''} ${task.description || ''}`.toLowerCase().includes(keyword))
    .slice(0, limit);
}

export function formatTaskMeta(task) {
  const pieces = [task.status, task.software].filter(Boolean);
  return pieces.length ? pieces.join(' - ') : 'No extra information';
}

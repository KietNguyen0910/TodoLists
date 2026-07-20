export const getClientKey = (clientName) => (clientName || '').trim().toLocaleLowerCase();

export const isActiveClientTask = (task) => !(task.deleted || task.isDeleted);

export function getClientSoftwareByName(tasks) {
  return tasks.filter(isActiveClientTask).reduce((softwareByClient, task) => {
    const clientKey = getClientKey(task.title);
    if (!clientKey) return softwareByClient;

    const values = softwareByClient.get(clientKey) || new Set();
    values.add(task.software || '');
    softwareByClient.set(clientKey, values);
    return softwareByClient;
  }, new Map());
}

export function getSoftwareSyncCount(tasks, clientName, software, excludedTaskId) {
  return getClientSyncCount(tasks, clientName, { software }, excludedTaskId);
}

export function getClientSyncCount(tasks, clientName, updates, excludedTaskId) {
  return tasks
    .filter((task) => isActiveClientTask(task) && task._id !== excludedTaskId && getClientKey(task.title) === getClientKey(clientName))
    .filter((task) => Object.entries(updates).some(([field, value]) => JSON.stringify(task[field] ?? null) !== JSON.stringify(value ?? null))).length;
}

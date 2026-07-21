export const getClientKey = (clientName) => (clientName || '').trim().toLocaleLowerCase();

export const isActiveClientTask = (task) => !(task.deleted || task.isDeleted);

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getSharedValue(values) {
  const unique = [...new Set(values.map((value) => value || ''))];
  return unique.length === 1 ? unique[0] : '';
}

function getUniqueProperties(tasks) {
  const properties = new Map();
  tasks.forEach((task) => {
    (Array.isArray(task.properties) ? task.properties : []).forEach((property) => {
      const address = property?.address?.trim();
      if (!address) return;

      const type = property.type === 'Investment' ? 'Investment' : 'Primary';
      properties.set(`${address}\u0000${type}`, { address, type });
    });
  });
  return [...properties.values()];
}

export function getClientProfiles(tasks) {
  const tasksByClient = tasks
    .filter(isActiveClientTask)
    .reduce((clients, task) => {
      const key = getClientKey(task.title);
      if (!key) return clients;

      const clientTasks = clients.get(key) || [];
      clientTasks.push(task);
      clients.set(key, clientTasks);
      return clients;
    }, new Map());

  return [...tasksByClient.entries()]
    .map(([key, clientTasks]) => ({
      key,
      name: clientTasks.find((task) => task.title?.trim())?.title.trim() || '',
      software: getSharedValue(clientTasks.map((task) => task.software || '')),
      payroll: getSharedValue(clientTasks.map((task) => task.payroll || '')),
      properties: getUniqueProperties(clientTasks),
      motorVehicles: uniqueValues(clientTasks.flatMap((task) => (
        Array.isArray(task.motorVehicles)
          ? task.motorVehicles.filter((vehicle) => typeof vehicle === 'string').map((vehicle) => vehicle.trim())
          : []
      ))),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function getClientSuggestions(clientProfiles, query, limit = 8) {
  const keyword = getClientKey(query);
  if (!keyword) return [];

  const prefixMatches = [];
  const containsMatches = [];
  clientProfiles.forEach((profile) => {
    if (profile.key.startsWith(keyword)) prefixMatches.push(profile);
    else if (profile.key.includes(keyword)) containsMatches.push(profile);
  });
  return [...prefixMatches, ...containsMatches].slice(0, limit);
}

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

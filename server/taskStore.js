const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

const STORE_FILE = process.env.TASK_STORE_FILE || path.join(__dirname, 'data', 'tasks.json');

function loadTasks() {
  try {
    if (!fs.existsSync(STORE_FILE)) return [];

    const content = fs.readFileSync(STORE_FILE, 'utf8');
    if (!content.trim()) return [];

    const tasks = JSON.parse(content);
    return Array.isArray(tasks) ? tasks : [];
  } catch (error) {
    console.warn('Failed to load fallback task store:', error.message);
    return [];
  }
}

function saveTasks() {
  try {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(memoryTasks, null, 2));
  } catch (error) {
    console.error('Failed to save fallback task store:', error.message);
  }
}

let memoryTasks = loadTasks();

const normalizeOutcomes = (value) => (Array.isArray(value) ? value : [value])
  .filter((outcome) => typeof outcome === 'string')
  .map((outcome) => outcome.trim())
  .filter(Boolean);

const AUDIT_FIELDS = [
  { field: 'title', label: 'Client', normalize: (value) => value || '' },
  { field: 'description', label: 'Task', normalize: (value) => value || '' },
  { field: 'outcomeAchieved', label: 'Outcome Achieved', normalize: normalizeOutcomes },
  { field: 'software', label: 'Software', normalize: (value) => value || '' },
  { field: 'assignDate', label: 'Assign Date', normalize: (value) => value || '' },
  { field: 'deadline', label: 'Deadline', normalize: (value) => value || '' },
  { field: 'notes', label: 'Note', normalize: (value) => value || '' },
  { field: 'status', label: 'Status', normalize: (value) => value || '' },
  { field: 'deleted', label: 'Deleted', normalize: (value) => Boolean(value) },
];

const areEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function createAuditLog(action, changes) {
  return {
    action,
    actor: 'User',
    changedAt: new Date(),
    changes,
  };
}

function buildUpdateChanges(currentTask, updates) {
  return AUDIT_FIELDS
    .filter(({ field }) => Object.prototype.hasOwnProperty.call(updates, field))
    .map(({ field, label, normalize }) => {
      const from = normalize(currentTask[field]);
      const to = normalize(updates[field]);

      return { field, label, from, to };
    })
    .filter(({ from, to }) => !areEqual(from, to));
}

function serializeTask(task) {
  return {
    _id: task._id,
    title: task.title,
    description: task.description || '',
    software: task.software || '',
    outcomeAchieved: Array.isArray(task.outcomeAchieved)
      ? task.outcomeAchieved
      : task.outcomeAchieved ? [task.outcomeAchieved] : [],
    assignDate: task.assignDate || '',
    deadline: task.deadline || '',
    notes: task.notes || '',
    status: task.status,
    completionDate: task.completionDate || null,
    statusHistory: task.statusHistory || [],
    auditLogs: task.auditLogs || [],
    deleted: Boolean(task.deleted || false),
    isDeleted: Boolean(task.deleted || false),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function getAllTasks() {
  return memoryTasks
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(serializeTask);
}

function createTask({ title, description, software, outcomeAchieved, assignDate, deadline, notes, status, statusHistory, auditLogs }) {
  const task = {
    _id: randomUUID(),
    title,
    description: description || '',
    software: software || '',
    outcomeAchieved: Array.isArray(outcomeAchieved) ? outcomeAchieved : outcomeAchieved ? [outcomeAchieved] : [],
    assignDate: assignDate || '',
    deadline: deadline || '',
    notes: notes || '',
    status,
    completionDate: status === 'Lodged/Completed' ? new Date() : null,
    statusHistory: statusHistory || [{ status, changedAt: new Date() }],
    auditLogs: auditLogs || [],
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryTasks.push(task);
  saveTasks();
  return serializeTask(task);
}

function updateTask(id, updates) {
  const index = memoryTasks.findIndex((task) => task._id === id);
  if (index === -1) return null;

  const current = memoryTasks[index];
  const history = current.statusHistory || [];
  const updateChanges = buildUpdateChanges(current, updates);

  if (updates.status && updates.status !== current.status) {
    updates.statusHistory = [
      ...history,
      { status: updates.status, changedAt: new Date() },
    ];
    if (updates.status === 'Lodged/Completed') {
      updates.completionDate = new Date();
    }
  }

  if (updateChanges.length > 0) {
    updates.auditLogs = [
      ...(current.auditLogs || []),
      createAuditLog(updates.deleted === true ? 'deleted' : 'updated', updateChanges),
    ];
  }

  memoryTasks[index] = {
    ...current,
    ...updates,
    updatedAt: new Date(),
  };

  saveTasks();
  return serializeTask(memoryTasks[index]);
}

function deleteTask(id) {
  const index = memoryTasks.findIndex((task) => task._id === id);
  if (index === -1) return null;

  const [removed] = memoryTasks.splice(index, 1);
  saveTasks();
  return serializeTask(removed);
}

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
};

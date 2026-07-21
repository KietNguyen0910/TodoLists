const { connectDb } = require('../../serverless/lib/db');
const Task = require('../../serverless/lib/Task');
const { requireAuth } = require('../../serverless/lib/auth');
const { STATUS_OPTIONS } = require('../../serverless/lib/statusConfig');
const { autoAssignInProgressSlots } = require('../../serverless/lib/autoAssign');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

const normalizeOutcomes = (value) => (Array.isArray(value) ? value : [value])
  .filter((outcome) => typeof outcome === 'string')
  .map((outcome) => outcome.trim())
  .filter(Boolean);
const normalizeTaskText = (value) => (typeof value === 'string' ? value.trim() : '');
const getTaskKey = ({ title, description }) => `${normalizeTaskText(title).toLowerCase()}\u0000${normalizeTaskText(description).toLowerCase()}`;
const isDeletedTask = (task) => Boolean(task?.deleted || task?.isDeleted);

const parseCompletionDate = (value) => {
  if (!value) return { valid: true, value: null };

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? { valid: false, value: null }
    : { valid: true, value: date };
};

const hasValue = (value) => (Array.isArray(value) ? value.length > 0 : value !== '' && value !== null && value !== undefined);

const buildCreateChanges = (task) => [
  ['title', 'Client', task.title],
  ['description', 'Task', task.description],
  ['outcomeAchieved', 'Outcome Achieved', task.outcomeAchieved],
  ['assignDate', 'Assign Date', task.assignDate],
  ['deadline', 'Deadline', task.deadline],
  ['notes', 'Note', task.notes],
  ['status', 'Status', task.status],
]
  .filter(([, , value]) => hasValue(value))
  .map(([field, label, to]) => ({ field, label, from: '', to }));

const createAuditLog = (task, actor) => ({
  action: 'imported',
  actor,
  changedAt: new Date(),
  changes: buildCreateChanges(task),
});

const serializeTask = (task) => {
  const taskObj = task.toObject ? task.toObject() : task;
  const isDeleted = isDeletedTask(taskObj);

  return {
    ...taskObj,
    software: taskObj.software || '',
    payroll: ['MYOB', 'Quickbook', 'Xero', 'Reckon'].includes(taskObj.payroll) ? taskObj.payroll : '',
    auditLogs: taskObj.auditLogs || [],
    deleted: isDeleted,
    isDeleted,
  };
};

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authUser = requireAuth(req, res);
  if (!authUser) return;

  const importedTasks = Array.isArray(req.body?.tasks) ? req.body.tasks : null;
  if (!importedTasks) {
    return res.status(400).json({ message: 'Tasks must be an array.' });
  }

  try {
    await connectDb();

    const invalidRows = [];
    const duplicateIncomingRows = [];
    const incomingKeys = new Set();
    const candidates = [];

    importedTasks.forEach((rawTask, index) => {
      const row = index + 1;
      const title = normalizeTaskText(rawTask?.title);
      const description = normalizeTaskText(rawTask?.description);
      const status = rawTask?.status;

      if (!title || !description) {
        invalidRows.push({ row, reason: 'Client and Task Description are required.' });
        return;
      }
      if (!STATUS_OPTIONS.includes(status)) {
        invalidRows.push({ row, reason: 'Status is not supported.' });
        return;
      }

      const completionDate = parseCompletionDate(rawTask?.completionDate);
      if (!completionDate.valid) {
        invalidRows.push({ row, reason: 'Actual Completion Date is invalid.' });
        return;
      }

      const key = getTaskKey({ title, description });
      if (incomingKeys.has(key)) {
        duplicateIncomingRows.push({ row, reason: 'Duplicate task in import.' });
        return;
      }
      incomingKeys.add(key);

      candidates.push({
        row,
        title,
        description,
        software: '',
        payroll: '',
        outcomeAchieved: normalizeOutcomes(rawTask?.outcomeAchieved),
        assignDate: rawTask?.assignDate || '',
        deadline: rawTask?.deadline || '',
        notes: rawTask?.notes || '',
        status,
        completionDate: completionDate.value || (status === 'Lodged/Completed' ? new Date() : null),
      });
    });

    const existingTasks = await Task.find();
    const existingTasksByKey = new Map(existingTasks.map((task) => [getTaskKey(task), task]));
    const skippedExistingRows = [];
    const tasksToRestore = [];
    const tasksToCreate = candidates.filter((task) => {
      const existingTask = existingTasksByKey.get(getTaskKey(task));
      if (!existingTask) return true;
      if (isDeletedTask(existingTask)) {
        tasksToRestore.push({ existingTask, task });
        return false;
      }

      skippedExistingRows.push({ row: task.row, reason: 'Task already exists.' });
      return false;
    });

    const actor = authUser.label || 'User';
    const payloads = tasksToCreate.map(({ row, ...task }) => ({
      ...task,
      statusHistory: [{ status: task.status, changedAt: new Date() }],
      auditLogs: [createAuditLog(task, actor)],
    }));
    const createdTasks = await Task.insertMany(payloads);

    const restoredTasks = await Promise.all(tasksToRestore.map(async ({ existingTask, task }) => {
      const { row, ...updates } = task;
      const currentTask = existingTask.toObject();
      const restoredTask = {
        ...updates,
        deleted: false,
        auditLogs: [
          ...(currentTask.auditLogs || []),
          createAuditLog(updates, actor),
        ],
      };
      if (updates.status !== currentTask.status) {
        restoredTask.statusHistory = [
          ...(currentTask.statusHistory || []),
          { status: updates.status, changedAt: new Date() },
        ];
      }

      return Task.findByIdAndUpdate(existingTask._id, restoredTask, { new: true });
    }));

    const autoAssignedTasks = await autoAssignInProgressSlots();

    return res.status(201).json({
      importedCount: createdTasks.length + restoredTasks.length,
      autoAssignedCount: autoAssignedTasks.length,
      restoredCount: restoredTasks.length,
      skippedCount: duplicateIncomingRows.length + skippedExistingRows.length,
      invalidCount: invalidRows.length,
      invalidRows,
      skippedRows: [...duplicateIncomingRows, ...skippedExistingRows],
      tasks: [...createdTasks, ...restoredTasks].map(serializeTask),
      autoAssignedTasks: autoAssignedTasks.map(serializeTask),
    });
  } catch (error) {
    console.error('Import API error:', error.message);
    return res.status(500).json({ message: 'Failed to import tasks', error: error.message });
  }
};

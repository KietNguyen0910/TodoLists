const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const taskStore = require('../taskStore');
const { requireAuth } = require('../auth');

const router = express.Router();

const VALID_STATUSES = [
  'Lodged/Completed',
  'Waiting for review',
  'Waiting client',
  'Sent query for Manager',
  'In Progress',
  'Initial Information Received',
  'On hold',
  'Sent Report to client',
];

const DEFAULT_STATUS = 'Initial Information Received';

const normalizeOutcomes = (value) => (Array.isArray(value) ? value : [value])
  .filter((outcome) => typeof outcome === 'string')
  .map((outcome) => outcome.trim())
  .filter(Boolean);
const normalizePayroll = (value) => (typeof value === 'boolean' ? value : null);
const normalizeTaskText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeProperties = (value) => (Array.isArray(value) ? value : [])
  .filter((property) => property && typeof property.address === 'string' && property.address.trim())
  .map((property) => ({
    address: property.address.trim(),
    type: property.type === 'Investment' ? 'Investment' : 'Primary',
  }));
const normalizeMotorVehicles = (value) => Array.from(new Set((Array.isArray(value) ? value : [])
  .filter((vehicle) => typeof vehicle === 'string')
  .map((vehicle) => vehicle.trim())
  .filter(Boolean)));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getTaskKey = ({ title, description }) => `${normalizeTaskText(title).toLowerCase()}\u0000${normalizeTaskText(description).toLowerCase()}`;
const isDeletedTask = (task) => Boolean(task?.deleted || task?.isDeleted);

const parseCompletionDate = (value) => {
  if (!value) return { valid: true, value: null };

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? { valid: false, value: null }
    : { valid: true, value: date };
};

const AUDIT_FIELDS = [
  { field: 'title', label: 'Client', normalize: (value) => value || '' },
  { field: 'description', label: 'Task', normalize: (value) => value || '' },
  { field: 'outcomeAchieved', label: 'Outcome Achieved', normalize: normalizeOutcomes },
  { field: 'software', label: 'Software', normalize: (value) => value || '' },
  { field: 'payroll', label: 'Payroll', normalize: normalizePayroll },
  { field: 'properties', label: 'Property', normalize: normalizeProperties },
  { field: 'motorVehicles', label: 'Motor Vehicle', normalize: normalizeMotorVehicles },
  { field: 'assignDate', label: 'Assign Date', normalize: (value) => value || '' },
  { field: 'deadline', label: 'Deadline', normalize: (value) => value || '' },
  { field: 'notes', label: 'Note', normalize: (value) => value || '' },
  { field: 'status', label: 'Status', normalize: (value) => value || '' },
  { field: 'deleted', label: 'Deleted', normalize: (value) => Boolean(value) },
];

const hasValue = (value) => (Array.isArray(value) ? value.length > 0 : value !== '' && value !== null && value !== undefined);

const areEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const createAuditLog = (action, changes, actor = 'User') => ({
  action,
  actor,
  changedAt: new Date(),
  changes,
});

const buildCreateChanges = (taskPayload) => AUDIT_FIELDS
  .filter(({ field }) => field !== 'deleted')
  .map(({ field, label, normalize }) => ({
    field,
    label,
    from: '',
    to: normalize(taskPayload[field]),
  }))
  .filter(({ to }) => hasValue(to));

const buildUpdateChanges = (currentTask, updates) => AUDIT_FIELDS
  .filter(({ field }) => Object.prototype.hasOwnProperty.call(updates, field))
  .map(({ field, label, normalize }) => {
    const from = normalize(currentTask[field]);
    const to = normalize(updates[field]);

    return { field, label, from, to };
  })
  .filter(({ from, to }) => !areEqual(from, to));

const isMongoConnected = () => mongoose.connection.readyState === 1;

const serializeTask = (task) => {
  if (!task) return task;

  const taskObj = task.toObject ? task.toObject() : task;
  const isDeleted = isDeletedTask(taskObj);

  return {
    ...taskObj,
    software: taskObj.software || '',
    payroll: typeof taskObj.payroll === 'boolean' ? taskObj.payroll : null,
    properties: normalizeProperties(taskObj.properties),
    motorVehicles: normalizeMotorVehicles(taskObj.motorVehicles),
    auditLogs: taskObj.auditLogs || [],
    deleted: isDeleted,
    isDeleted,
  };
};

router.get('/', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.json(taskStore.getAllTasks());
    }

    const tasks = await Task.find().sort({ createdAt: 1 });
    res.json(tasks.map(serializeTask));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const actor = req.authUser?.label || 'User';
    const { title, description, software, payroll, properties, motorVehicles, outcomeAchieved, assignDate, deadline, notes, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const normalizedStatus = VALID_STATUSES.includes(status) ? status : DEFAULT_STATUS;
    const taskPayload = {
      title: title.trim(),
      description: description || '',
      software: software || '',
      payroll: normalizePayroll(payroll),
      properties: normalizeProperties(properties),
      motorVehicles: normalizeMotorVehicles(motorVehicles),
      outcomeAchieved: normalizeOutcomes(outcomeAchieved),
      assignDate: assignDate || '',
      deadline: deadline || '',
      notes: notes || '',
      status: normalizedStatus,
      completionDate: normalizedStatus === 'Lodged/Completed' ? new Date() : null,
      statusHistory: [{ status: normalizedStatus, changedAt: new Date() }],
    };
    taskPayload.auditLogs = [createAuditLog('created', buildCreateChanges(taskPayload), actor)];

    if (!isMongoConnected()) {
      const task = taskStore.createTask(taskPayload);
      return res.status(201).json(task);
    }

    const task = new Task(taskPayload);
    await task.save();
    res.status(201).json(serializeTask(task));
  } catch (error) {
    res.status(500).json({ message: 'Failed to create task', error: error.message });
  }
});

router.post('/import', requireAuth, async (req, res) => {
  try {
    const importedTasks = Array.isArray(req.body?.tasks) ? req.body.tasks : null;
    if (!importedTasks) {
      return res.status(400).json({ message: 'Tasks must be an array.' });
    }

    const invalidRows = [];
    const incomingKeys = new Set();
    const duplicateIncomingRows = [];
    const candidates = [];

    importedTasks.forEach((rawTask, index) => {
      const title = normalizeTaskText(rawTask?.title);
      const description = normalizeTaskText(rawTask?.description);
      const status = rawTask?.status;
      const row = index + 1;

      if (!title || !description) {
        invalidRows.push({ row, reason: 'Client and Task Description are required.' });
        return;
      }
      if (!VALID_STATUSES.includes(status)) {
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
        title,
        description,
        software: '',
        payroll: null,
        properties: [],
        motorVehicles: [],
        outcomeAchieved: normalizeOutcomes(rawTask?.outcomeAchieved),
        assignDate: rawTask?.assignDate || '',
        deadline: rawTask?.deadline || '',
        notes: rawTask?.notes || '',
        status,
        completionDate: completionDate.value || (status === 'Lodged/Completed' ? new Date() : null),
      });
    });

    const existingTasks = isMongoConnected()
      ? await Task.find()
      : taskStore.getAllTasks();
    const existingTasksByKey = new Map(existingTasks.map((task) => [getTaskKey(task), task]));
    const skippedExistingRows = [];
    const tasksToRestore = [];
    const tasksToCreate = candidates.filter((task, index) => {
      const existingTask = existingTasksByKey.get(getTaskKey(task));
      if (!existingTask) return true;
      if (isDeletedTask(existingTask)) {
        tasksToRestore.push({ existingTask, task });
        return false;
      }
      skippedExistingRows.push({ row: index + 1, reason: 'Task already exists.' });
      return false;
    });

    const actor = req.authUser?.label || 'User';
    const payloads = tasksToCreate.map((task) => {
      const payload = {
        ...task,
        statusHistory: [{ status: task.status, changedAt: new Date() }],
      };
      payload.auditLogs = [createAuditLog('imported', buildCreateChanges(payload), actor)];
      return payload;
    });

    const createdTasks = isMongoConnected()
      ? await Task.insertMany(payloads)
      : payloads.map((task) => taskStore.createTask(task));

    const restoredTasks = isMongoConnected()
      ? await Promise.all(tasksToRestore.map(async ({ existingTask, task }) => {
        const currentTask = existingTask.toObject();
        const updates = { ...task, deleted: false, isDeleted: false };
        const changes = buildUpdateChanges(currentTask, updates);
        updates.auditLogs = [
          ...(currentTask.auditLogs || []),
          createAuditLog('restored', changes, actor),
        ];
        if (task.status !== currentTask.status) {
          updates.statusHistory = [
            ...(currentTask.statusHistory || []),
            { status: task.status, changedAt: new Date() },
          ];
        }
        return Task.findByIdAndUpdate(existingTask._id, updates, { new: true });
      }))
      : tasksToRestore.map(({ existingTask, task }) => taskStore.updateTask(existingTask._id, { ...task, deleted: false }, actor));

    return res.status(201).json({
      importedCount: createdTasks.length + restoredTasks.length,
      restoredCount: restoredTasks.length,
      skippedCount: duplicateIncomingRows.length + skippedExistingRows.length,
      invalidCount: invalidRows.length,
      invalidRows,
      skippedRows: [...duplicateIncomingRows, ...skippedExistingRows],
      tasks: [...createdTasks, ...restoredTasks].map(serializeTask),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to import tasks', error: error.message });
  }
});

router.post('/bulk-delete', requireAuth, async (req, res) => {
  try {
    const taskIds = Array.isArray(req.body?.taskIds)
      ? [...new Set(req.body.taskIds.filter((id) => typeof id === 'string' && id.trim()))]
      : [];

    if (taskIds.length === 0) {
      return res.status(400).json({ message: 'Select at least one task to delete.' });
    }

    const actor = req.authUser?.label || 'User';

    if (!isMongoConnected()) {
      const deletedTasks = taskIds
        .map((taskId) => taskStore.updateTask(taskId, { deleted: true }, actor))
        .filter(Boolean);
      return res.json({ deletedCount: deletedTasks.length });
    }

    const existingTasks = await Task.find({ _id: { $in: taskIds }, deleted: { $ne: true } });
    await Promise.all(existingTasks.map((task) => {
      const updates = { deleted: true };
      const changes = buildUpdateChanges(task.toObject(), updates);
      updates.auditLogs = [
        ...(task.auditLogs || []),
        createAuditLog('deleted', changes, actor),
      ];
      return Task.findByIdAndUpdate(task._id, updates);
    }));

    return res.json({ deletedCount: existingTasks.length });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete tasks', error: error.message });
  }
});

router.patch('/client', requireAuth, async (req, res) => {
  try {
    const clientName = normalizeTaskText(req.body?.clientName);
    const rawUpdates = req.body?.updates;
    if (!clientName) {
      return res.status(400).json({ message: 'Client name is required.' });
    }
    if (!rawUpdates || typeof rawUpdates !== 'object' || Array.isArray(rawUpdates)) {
      return res.status(400).json({ message: 'Client updates are required.' });
    }

    const allowedFields = new Set(['title', 'software', 'payroll', 'properties', 'motorVehicles']);
    if (Object.keys(rawUpdates).some((field) => !allowedFields.has(field))) {
      return res.status(400).json({ message: 'Client updates contain an unsupported field.' });
    }

    const updates = {};
    if (rawUpdates.title !== undefined) {
      const title = normalizeTaskText(rawUpdates.title);
      if (!title) return res.status(400).json({ message: 'Client name cannot be empty.' });
      updates.title = title;
    }
    if (rawUpdates.software !== undefined) {
      if (typeof rawUpdates.software !== 'string') return res.status(400).json({ message: 'Software must be a string.' });
      updates.software = normalizeTaskText(rawUpdates.software);
    }
    if (rawUpdates.payroll !== undefined) {
      if (rawUpdates.payroll !== null && typeof rawUpdates.payroll !== 'boolean') return res.status(400).json({ message: 'Payroll must be Yes, No, or empty.' });
      updates.payroll = normalizePayroll(rawUpdates.payroll);
    }
    if (rawUpdates.properties !== undefined) {
      if (!Array.isArray(rawUpdates.properties)) return res.status(400).json({ message: 'Properties must be an array.' });
      updates.properties = normalizeProperties(rawUpdates.properties);
    }
    if (rawUpdates.motorVehicles !== undefined) {
      if (!Array.isArray(rawUpdates.motorVehicles)) return res.status(400).json({ message: 'Motor vehicles must be an array.' });
      updates.motorVehicles = normalizeMotorVehicles(rawUpdates.motorVehicles);
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Select at least one client field to update.' });
    }

    const actor = req.authUser?.label || 'User';
    const isMatchingClient = (task) => !isDeletedTask(task)
      && normalizeTaskText(task.title).toLocaleLowerCase() === clientName.toLocaleLowerCase();
    const matchingTasks = isMongoConnected()
      ? await Task.find({
        title: { $regex: new RegExp(`^${escapeRegex(clientName)}$`, 'i') },
        deleted: { $ne: true },
        isDeleted: { $ne: true },
      })
      : taskStore.getAllTasks().filter(isMatchingClient);

    if (matchingTasks.length === 0) {
      return res.status(404).json({ message: 'Client was not found.' });
    }

    let updatedCount = 0;
    const updatedTasks = [];
    for (const matchingTask of matchingTasks) {
      const currentTask = matchingTask.toObject ? matchingTask.toObject() : matchingTask;
      const changes = buildUpdateChanges(currentTask, updates);
      if (changes.length === 0) {
        updatedTasks.push(serializeTask(matchingTask));
        continue;
      }

      const taskUpdates = {
        ...updates,
        auditLogs: [
          ...(currentTask.auditLogs || []),
          createAuditLog('updated', changes, actor),
        ],
      };
      const updatedTask = isMongoConnected()
        ? await Task.findByIdAndUpdate(matchingTask._id, taskUpdates, { new: true })
        : taskStore.updateTask(matchingTask._id, updates, actor);
      updatedTasks.push(serializeTask(updatedTask));
      updatedCount += 1;
    }

    return res.json({ matchedCount: matchingTasks.length, updatedCount, tasks: updatedTasks });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update client.', error: error.message });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const actor = req.authUser?.label || 'User';
    const { title, description, software, payroll, properties, motorVehicles, outcomeAchieved, assignDate, deadline, notes, status, deleted } = req.body;
    const updates = {};

    if (title !== undefined) {
      updates.title = title.trim();
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (software !== undefined) {
      updates.software = software;
    }
    if (payroll !== undefined) {
      updates.payroll = normalizePayroll(payroll);
    }
    if (properties !== undefined) {
      updates.properties = normalizeProperties(properties);
    }
    if (motorVehicles !== undefined) {
      updates.motorVehicles = normalizeMotorVehicles(motorVehicles);
    }
    if (outcomeAchieved !== undefined) {
      updates.outcomeAchieved = normalizeOutcomes(outcomeAchieved);
    }
    if (assignDate !== undefined) {
      updates.assignDate = assignDate;
    }
    if (deadline !== undefined) {
      updates.deadline = deadline;
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }
    if (deleted !== undefined) {
      updates.deleted = deleted;
    }
    if (status !== undefined) {
      updates.status = VALID_STATUSES.includes(status) ? status : DEFAULT_STATUS;
      if (updates.status === 'Lodged/Completed') {
        updates.completionDate = new Date();
      }
    }

    if (!isMongoConnected()) {
      const task = taskStore.updateTask(req.params.id, updates, actor);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      return res.json(task);
    }

    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updateChanges = buildUpdateChanges(existingTask.toObject(), updates);
    if (updateChanges.length > 0) {
      updates.auditLogs = [
        ...(existingTask.auditLogs || []),
        createAuditLog(updates.deleted === true ? 'deleted' : 'updated', updateChanges, actor),
      ];
    }

    if (status !== undefined) {
      updates.statusHistory = [
        ...(existingTask.statusHistory || []),
        { status: updates.status, changedAt: new Date() },
      ];
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    res.json(serializeTask(task));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update task', error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const task = taskStore.deleteTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      return res.json({ message: 'Task deleted successfully' });
    }

    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete task', error: error.message });
  }
});

module.exports = router;

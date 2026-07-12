const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const taskStore = require('../taskStore');

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

const AUDIT_FIELDS = [
  { field: 'title', label: 'Client', normalize: (value) => value || '' },
  { field: 'description', label: 'Task', normalize: (value) => value || '' },
  { field: 'outcomeAchieved', label: 'Outcome Achieved', normalize: normalizeOutcomes },
  { field: 'software', label: 'Software', normalize: (value) => value || '' },
  { field: 'payroll', label: 'Payroll', normalize: normalizePayroll },
  { field: 'assignDate', label: 'Assign Date', normalize: (value) => value || '' },
  { field: 'deadline', label: 'Deadline', normalize: (value) => value || '' },
  { field: 'notes', label: 'Note', normalize: (value) => value || '' },
  { field: 'status', label: 'Status', normalize: (value) => value || '' },
  { field: 'deleted', label: 'Deleted', normalize: (value) => Boolean(value) },
];

const hasValue = (value) => (Array.isArray(value) ? value.length > 0 : value !== '' && value !== null && value !== undefined);

const areEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const createAuditLog = (action, changes) => ({
  action,
  actor: 'User',
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
  const isDeleted = Boolean(taskObj.deleted ?? taskObj.isDeleted ?? false);

  return {
    ...taskObj,
    software: taskObj.software || '',
    payroll: typeof taskObj.payroll === 'boolean' ? taskObj.payroll : null,
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

router.post('/', async (req, res) => {
  try {
    const { title, description, software, payroll, outcomeAchieved, assignDate, deadline, notes, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const normalizedStatus = VALID_STATUSES.includes(status) ? status : DEFAULT_STATUS;
    const taskPayload = {
      title: title.trim(),
      description: description || '',
      software: software || '',
      payroll: normalizePayroll(payroll),
      outcomeAchieved: normalizeOutcomes(outcomeAchieved),
      assignDate: assignDate || '',
      deadline: deadline || '',
      notes: notes || '',
      status: normalizedStatus,
      completionDate: normalizedStatus === 'Lodged/Completed' ? new Date() : null,
      statusHistory: [{ status: normalizedStatus, changedAt: new Date() }],
    };
    taskPayload.auditLogs = [createAuditLog('created', buildCreateChanges(taskPayload))];

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

router.patch('/:id', async (req, res) => {
  try {
    const { title, description, software, payroll, outcomeAchieved, assignDate, deadline, notes, status, deleted } = req.body;
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
      const task = taskStore.updateTask(req.params.id, updates);
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
        createAuditLog(updates.deleted === true ? 'deleted' : 'updated', updateChanges),
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

router.delete('/:id', async (req, res) => {
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

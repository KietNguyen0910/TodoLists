const { connectDb } = require('../lib/db');
const Task = require('../lib/Task');
const { requireAuth } = require('../lib/auth');
const { autoAssignInProgressSlots } = require('../lib/autoAssign');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

const serializeTask = (task) => {
  if (!task) return task;

  const taskObj = task.toObject ? task.toObject() : task;
  const isDeleted = Boolean(taskObj.deleted ?? taskObj.isDeleted ?? false);

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

const normalizeOutcomes = (value) => (Array.isArray(value) ? value : [value])
  .filter((outcome) => typeof outcome === 'string')
  .map((outcome) => outcome.trim())
  .filter(Boolean);
const normalizePayroll = (value) => (typeof value === 'boolean' ? value : null);
const normalizeProperties = (value) => (Array.isArray(value) ? value : [])
  .filter((property) => property && typeof property.address === 'string' && property.address.trim())
  .map((property) => ({ address: property.address.trim(), type: property.type === 'Investment' ? 'Investment' : 'Primary' }));
const normalizeMotorVehicles = (value) => Array.from(new Set((Array.isArray(value) ? value : [])
  .filter((vehicle) => typeof vehicle === 'string')
  .map((vehicle) => vehicle.trim())
  .filter(Boolean)));
const normalizeTaskText = (value) => (typeof value === 'string' ? value.trim() : '');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CLIENT_SYNC_FIELDS = new Set(['software', 'payroll', 'properties', 'motorVehicles']);

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

const areEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const createAuditLog = (action, changes, actor = 'User') => ({
  action,
  actor,
  changedAt: new Date(),
  changes,
});

const buildUpdateChanges = (currentTask, updates) => AUDIT_FIELDS
  .filter(({ field }) => Object.prototype.hasOwnProperty.call(updates, field))
  .map(({ field, label, normalize }) => {
    const from = normalize(currentTask[field]);
    const to = normalize(updates[field]);

    return { field, label, from, to };
  })
  .filter(({ from, to }) => !areEqual(from, to));

function getClientSyncUpdates(source, fields, includeSoftware = false) {
  const requestedFields = new Set([...(Array.isArray(fields) ? fields : []), ...(includeSoftware ? ['software'] : [])]);
  return [...requestedFields].reduce((updates, field) => (
    CLIENT_SYNC_FIELDS.has(field) && Object.prototype.hasOwnProperty.call(source, field)
      ? { ...updates, [field]: source[field] }
      : updates
  ), {});
}

async function syncClientFieldsAcrossTasks(clientName, clientUpdates, actor) {
  const normalizedClientName = normalizeTaskText(clientName);
  const matchingTasks = await Task.find({
    title: { $regex: new RegExp(`^${escapeRegex(normalizedClientName)}$`, 'i') },
    deleted: { $ne: true },
    isDeleted: { $ne: true },
  });
  let updatedCount = 0;

  await Promise.all(matchingTasks.map(async (matchingTask) => {
    const currentTask = matchingTask.toObject();
    const changes = Object.entries(clientUpdates)
      .map(([field, value]) => {
        const config = AUDIT_FIELDS.find((item) => item.field === field);
        const from = config.normalize(currentTask[field]);
        const to = config.normalize(value);
        return { field, label: config.label, from, to };
      })
      .filter(({ from, to }) => JSON.stringify(from) !== JSON.stringify(to));
    if (changes.length === 0) return;

    updatedCount += 1;
    await Task.findByIdAndUpdate(matchingTask._id, {
      ...clientUpdates,
      auditLogs: [
        ...(currentTask.auditLogs || []),
        createAuditLog('updated', changes, actor),
      ],
    });
  }));

  return { matchedCount: matchingTasks.length, updatedCount };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  try {
    await connectDb();

    if (req.method === 'PATCH') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;

      const actor = authUser.label || 'User';
      const { title, description, software, payroll, properties, motorVehicles, outcomeAchieved, assignDate, deadline, notes, status, deleted, syncSoftwareForClient, syncClientFields } = req.body;
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

      const existingTask = await Task.findById(id);
      if (!existingTask) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (status !== undefined) {
        const normalizedStatus = VALID_STATUSES.includes(status) ? status : DEFAULT_STATUS;
        updates.status = normalizedStatus;
        updates.statusHistory = [
          ...(existingTask.statusHistory || []),
          { status: normalizedStatus, changedAt: new Date() },
        ];
        if (normalizedStatus === 'Lodged/Completed') {
          updates.completionDate = new Date();
        }
      }

      const updateChanges = buildUpdateChanges(existingTask.toObject(), updates);
      if (updateChanges.length > 0) {
        updates.auditLogs = [
          ...(existingTask.auditLogs || []),
          createAuditLog(updates.deleted === true ? 'deleted' : 'updated', updateChanges, actor),
        ];
      }

      const task = await Task.findByIdAndUpdate(id, updates, { new: true });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      await autoAssignInProgressSlots();

      const clientUpdates = getClientSyncUpdates(updates, syncClientFields, syncSoftwareForClient);
      const syncResult = Object.keys(clientUpdates).length ? await syncClientFieldsAcrossTasks(task.title, clientUpdates, actor) : null;
      return res.status(200).json(syncResult ? { task: serializeTask(task), ...syncResult } : serializeTask(task));
    }

    if (req.method === 'DELETE') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;

      const task = await Task.findByIdAndDelete(id);

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      await autoAssignInProgressSlots();

      return res.status(200).json({ message: 'Task deleted successfully', isDeleted: true, deleted: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error.message);
    return res.status(500).json({ message: 'Failed to process request', error: error.message });
  }
};

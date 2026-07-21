const { connectDb } = require('../../serverless/lib/db');
const Task = require('../../serverless/lib/Task');
const { requireAuth } = require('../../serverless/lib/auth');
const { autoAssignInProgressSlots } = require('../../serverless/lib/autoAssign');

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
    payroll: normalizePayroll(taskObj.payroll),
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
const normalizePayroll = (value) => ['MYOB', 'Quickbook', 'Xero', 'Reckon'].includes(value) ? value : '';
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
];

const hasValue = (value) => (Array.isArray(value) ? value.length > 0 : value !== '' && value !== null && value !== undefined);

const createAuditLog = (action, changes, actor = 'User') => ({
  action,
  actor,
  changedAt: new Date(),
  changes,
});

const buildCreateChanges = (taskPayload) => AUDIT_FIELDS
  .map(({ field, label, normalize }) => ({
    field,
    label,
    from: '',
    to: normalize(taskPayload[field]),
  }))
  .filter(({ to }) => hasValue(to));

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

  const updatedTasks = await Promise.all(matchingTasks.map(async (matchingTask) => {
    const currentTask = matchingTask.toObject();
    const changes = Object.entries(clientUpdates)
      .map(([field, value]) => {
        const config = AUDIT_FIELDS.find((item) => item.field === field);
        const from = config.normalize(currentTask[field]);
        const to = config.normalize(value);
        return { field, label: config.label, from, to };
      })
      .filter(({ from, to }) => JSON.stringify(from) !== JSON.stringify(to));
    if (changes.length === 0) return serializeTask(matchingTask);

    updatedCount += 1;
    const updatedTask = await Task.findByIdAndUpdate(matchingTask._id, {
      ...clientUpdates,
      auditLogs: [
        ...(currentTask.auditLogs || []),
        createAuditLog('updated', changes, actor),
      ],
    }, { new: true });
    return serializeTask(updatedTask);
  }));

  return { matchedCount: matchingTasks.length, updatedCount, tasks: updatedTasks };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDb();

    if (req.method === 'GET') {
      const tasks = await Task.find().sort({ createdAt: 1 });
      return res.status(200).json(tasks.map(serializeTask));
    }

    if (req.method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;

      const actor = authUser.label || 'User';
      const { title, description, software, payroll, properties, motorVehicles, outcomeAchieved, assignDate, deadline, notes, status, syncSoftwareForClient, syncClientFields } = req.body;
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
      const normalizedStatus = VALID_STATUSES.includes(status) ? status : DEFAULT_STATUS;

      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Title is required' });
      }

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

      const task = await Task.create(taskPayload);
      const clientUpdates = getClientSyncUpdates(taskPayload, syncClientFields, syncSoftwareForClient);
      const syncResult = Object.keys(clientUpdates).length ? await syncClientFieldsAcrossTasks(task.title, clientUpdates, actor) : null;
      const autoAssignedTasks = await autoAssignInProgressSlots();

      return res.status(201).json({
        task: serializeTask(task),
        ...(syncResult || {}),
        autoAssignedTasks: autoAssignedTasks.map(serializeTask),
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error.message);
    return res.status(500).json({ message: 'Failed to process request', error: error.message });
  }
};

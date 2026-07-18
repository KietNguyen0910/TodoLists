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
      const { title, description, software, payroll, outcomeAchieved, assignDate, deadline, notes, status } = req.body;
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
      await autoAssignInProgressSlots();

      return res.status(201).json(serializeTask(task));
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error.message);
    return res.status(500).json({ message: 'Failed to process request', error: error.message });
  }
};

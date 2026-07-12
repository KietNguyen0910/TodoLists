const { connectDb } = require('../lib/db');
const Task = require('../lib/Task');
const { getAuthUser } = require('../lib/auth');

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
      const actor = getAuthUser(req)?.label || 'Guest';
      const { title, description, software, payroll, outcomeAchieved, assignDate, deadline, notes, status, deleted } = req.body;
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

      return res.status(200).json(serializeTask(task));
    }

    if (req.method === 'DELETE') {
      const task = await Task.findByIdAndDelete(id);

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      return res.status(200).json({ message: 'Task deleted successfully', isDeleted: true, deleted: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error.message);
    return res.status(500).json({ message: 'Failed to process request', error: error.message });
  }
};

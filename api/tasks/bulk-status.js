const { connectDb } = require('../lib/db');
const Task = require('../lib/Task');
const { requireAuth } = require('../lib/auth');
const { autoAssignInProgressSlots } = require('../lib/autoAssign');

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

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const authUser = requireAuth(req, res);
  if (!authUser) return;

  const taskIds = Array.isArray(req.body?.taskIds)
    ? [...new Set(req.body.taskIds.filter((id) => typeof id === 'string' && id.trim()))]
    : [];
  const status = req.body?.status;
  if (!taskIds.length) return res.status(400).json({ message: 'Select at least one task.' });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ message: 'Status is not supported.' });

  try {
    await connectDb();
    const actor = authUser.label || 'User';
    const tasks = await Task.find({ _id: { $in: taskIds }, deleted: { $ne: true }, isDeleted: { $ne: true } });
    const updatedTasks = [];
    let updatedCount = 0;

    for (const task of tasks) {
      if (task.status === status) {
        updatedTasks.push(task);
        continue;
      }

      const changes = [{ field: 'status', label: 'Status', from: task.status, to: status }];
      const updates = {
        status,
        statusHistory: [...(task.statusHistory || []), { status, changedAt: new Date() }],
        auditLogs: [...(task.auditLogs || []), { action: 'updated', actor, changedAt: new Date(), changes }],
      };
      if (status === 'Lodged/Completed') updates.completionDate = new Date();
      updatedTasks.push(await Task.findByIdAndUpdate(task._id, updates, { new: true }));
      updatedCount += 1;
    }

    const autoAssignedTasks = await autoAssignInProgressSlots();
    return res.status(200).json({ matchedCount: tasks.length, updatedCount, autoAssignedCount: autoAssignedTasks.length, tasks: updatedTasks });
  } catch (error) {
    console.error('Bulk status API error:', error.message);
    return res.status(500).json({ message: 'Failed to update task statuses.', error: error.message });
  }
};

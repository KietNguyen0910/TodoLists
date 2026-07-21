const { connectDb } = require('../../serverless/lib/db');
const Task = require('../../serverless/lib/Task');
const { requireAuth } = require('../../serverless/lib/auth');
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

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const authUser = requireAuth(req, res);
  if (!authUser) return;

  const taskIds = Array.isArray(req.body?.taskIds)
    ? [...new Set(req.body.taskIds.filter((id) => typeof id === 'string' && id.trim()))]
    : [];
  if (!taskIds.length) return res.status(400).json({ message: 'Select at least one task to delete.' });

  try {
    await connectDb();
    const tasks = await Task.find({ _id: { $in: taskIds }, deleted: { $ne: true } });
    const actor = authUser.label || 'User';

    await Promise.all(tasks.map((task) => Task.findByIdAndUpdate(task._id, {
      deleted: true,
      auditLogs: [
        ...(task.auditLogs || []),
        {
          action: 'deleted',
          actor,
          changedAt: new Date(),
          changes: [{ field: 'deleted', label: 'Deleted', from: false, to: true }],
        },
      ],
    })));

    const autoAssignedTasks = await autoAssignInProgressSlots();
    return res.status(200).json({
      deletedCount: tasks.length,
      deletedIds: tasks.map((task) => String(task._id)),
      autoAssignedCount: autoAssignedTasks.length,
      autoAssignedTasks,
    });
  } catch (error) {
    console.error('Bulk delete API error:', error.message);
    return res.status(500).json({ message: 'Failed to delete tasks', error: error.message });
  }
};

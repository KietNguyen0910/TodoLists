const Task = require('./Task');
const { IN_PROGRESS_STATUS, createAutoAssignLog, selectAutomaticAssignments } = require('../../shared/autoAssign');

async function autoAssignInProgressSlots() {
  const tasks = await Task.find();
  const candidates = selectAutomaticAssignments(tasks);

  return Promise.all(candidates.map((task) => {
    const changedAt = new Date();
    const taskObject = task.toObject();
    return Task.findByIdAndUpdate(task._id, {
      status: IN_PROGRESS_STATUS,
      statusHistory: [...(taskObject.statusHistory || []), { status: IN_PROGRESS_STATUS, changedAt }],
      auditLogs: [...(taskObject.auditLogs || []), createAutoAssignLog(taskObject, changedAt)],
    }, { new: true });
  }));
}

module.exports = { autoAssignInProgressSlots };

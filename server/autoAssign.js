const mongoose = require('mongoose');
const Task = require('./models/Task');
const taskStore = require('./taskStore');
const { IN_PROGRESS_STATUS, createAutoAssignLog, selectAutomaticAssignments } = require('../shared/autoAssign');

async function autoAssignInProgressSlots() {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const tasks = isMongoConnected ? await Task.find() : taskStore.getAllTasks();
  const candidates = selectAutomaticAssignments(tasks);

  if (!candidates.length) return [];

  if (!isMongoConnected) {
    return candidates.map((task) => taskStore.autoAssignTask(task._id)).filter(Boolean);
  }

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

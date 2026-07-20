export function getTaskRangeIds(tasks, anchorTaskId, targetTaskId) {
  const anchorIndex = tasks.findIndex((task) => task._id === anchorTaskId);
  const targetIndex = tasks.findIndex((task) => task._id === targetTaskId);
  if (anchorIndex === -1 || targetIndex === -1) return [];

  const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  return tasks.slice(start, end + 1).map((task) => task._id);
}

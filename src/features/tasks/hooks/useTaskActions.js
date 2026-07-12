import { useState } from 'react';
import { createTask, updateTask } from '../../../api/taskApi';

export function useTaskActions({
  editingTask,
  closeTaskModal,
  expireSession,
  loadTasks,
  requireLogin,
  setError,
  setTasks,
  showToast,
  taskToDelete,
  setTaskToDelete,
}) {
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState(null);

  const handleRequestError = (requestError, fallbackMessage) => {
    if (requestError?.status === 401) {
      expireSession();
      return;
    }

    setError(fallbackMessage);
  };

  const handleTaskSubmit = async (taskData) => {
    if (!requireLogin(editingTask ? 'update tasks' : 'add tasks')) return;

    setIsSubmittingTask(true);
    try {
      if (editingTask) {
        const updatedTask = await updateTask(editingTask._id, taskData);
        setTasks((currentTasks) => currentTasks.map((task) => (
          task._id === editingTask._id
            ? { ...task, ...(updatedTask || {}), ...taskData, _id: task._id }
            : task
        )));
        showToast('Task updated successfully.');
      } else {
        await createTask(taskData);
        showToast('Task created successfully.');
        await loadTasks();
      }
      closeTaskModal();
    } catch (requestError) {
      handleRequestError(requestError, editingTask ? 'Unable to update task.' : 'Unable to create task.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    if (!requireLogin('change task status')) return;

    setUpdatingStatusTaskId(taskId);
    try {
      await updateTask(taskId, { status });
      if (status === 'Lodged/Completed') showToast('Task status updated to Lodged/Completed.');
      await loadTasks();
    } catch (requestError) {
      handleRequestError(requestError, 'Unable to update task.');
    } finally {
      setUpdatingStatusTaskId(null);
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    if (!requireLogin('delete tasks')) {
      setTaskToDelete(null);
      return;
    }

    setIsDeletingTask(true);
    try {
      await updateTask(taskToDelete.id, { deleted: true });
      showToast('Task deleted successfully.');
      await loadTasks();
    } catch (requestError) {
      handleRequestError(requestError, 'Unable to delete task.');
    } finally {
      setIsDeletingTask(false);
      setTaskToDelete(null);
    }
  };

  return {
    isDeletingTask,
    isSubmittingTask,
    updatingStatusTaskId,
    handleStatusChange,
    handleTaskSubmit,
    confirmDelete,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { createTask, getTasks, updateTask } from './api/tasks';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import TaskCard from './components/TaskCard';
import TaskHistoryModal from './components/TaskHistoryModal';
import TaskModal from './components/TaskModal';
import { STATUS_MAP } from './statusConfig';

const TABS = [
  { id: 'todo', label: 'Todo List', title: 'Todo List', statuses: ['Initial Information Received', 'In Progress', 'Sent Report to client', 'On hold'] },
  { id: 'waiting', label: 'Waiting', title: 'Waiting Tasks', statuses: ['Waiting for review', 'Waiting client', 'Sent query for Manager'] },
  { id: 'completed', label: 'Completed', title: 'Completed Tasks', statuses: ['Lodged/Completed'] },
];

const isActiveTask = (task) => !(task.deleted || task.isDeleted);

function getDateTime(value) {
  if (!value) return 0;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortTasksForTab(tasks, tabId) {
  if (!['waiting', 'completed'].includes(tabId)) return tasks;

  return [...tasks].sort((first, second) => getDateTime(second.assignDate) - getDateTime(first.assignDate));
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState(null);
  const [error, setError] = useState('');
  const [activeTabId, setActiveTabId] = useState('todo');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef();

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = window.setTimeout(() => setToastMessage(''), 3000);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setError('');
      setTasks(await getTasks());
    } catch {
      setError('Unable to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    return () => window.clearTimeout(toastTimer.current);
  }, [loadTasks]);

  const activeTab = TABS.find((tab) => tab.id === activeTabId) || TABS[0];
  const showCompletionTime = activeTab.id === 'completed';
  const visibleTasks = sortTasksForTab(
    tasks.filter(isActiveTask).filter((task) => activeTab.statuses.includes(task.status)),
    activeTab.id
  );
  const getCount = (tab) => tasks.filter(isActiveTask).filter((task) => tab.statuses.includes(task.status)).length;

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleTaskSubmit = async (taskData) => {
    setIsSubmittingTask(true);
    try {
      if (editingTask) {
        await updateTask(editingTask._id, taskData);
        showToast('Task updated successfully.');
      } else {
        await createTask(taskData);
        showToast('Task created successfully.');
      }
      closeTaskModal();
      await loadTasks();
    } catch {
      setError(editingTask ? 'Unable to update task.' : 'Unable to create task.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    setUpdatingStatusTaskId(taskId);
    try {
      await updateTask(taskId, { status });
      if (status === 'Lodged/Completed') showToast('Task status updated to Lodged/Completed.');
      await loadTasks();
    } catch {
      setError('Unable to update task.');
    } finally {
      setUpdatingStatusTaskId(null);
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await updateTask(taskToDelete.id, { deleted: true });
      showToast('Task deleted successfully.');
      await loadTasks();
    } catch {
      setError('Unable to delete task.');
    } finally {
      setTaskToDelete(null);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div><p className="eyebrow">Cassie Nguyen</p><h1>Daily Outcome-Based Updates</h1></div>
        <button className="button-primary" type="button" onClick={() => { setEditingTask(null); setIsModalOpen(true); }}>Add Task</button>
      </header>
      <div className="main-layout">
        <aside className="sidebar"><h2>Tabs</h2>{TABS.map((tab) => <button key={tab.id} type="button" className={`sidebar-button ${activeTab.id === tab.id ? 'active' : ''}`} onClick={() => setActiveTabId(tab.id)}>{tab.label}<span className="task-count">({getCount(tab)})</span></button>)}</aside>
        <section className="content">
          <div className="content-header"><h2>{activeTab.title}</h2><span className="task-count">({visibleTasks.length})</span></div>
          {error && <p className="error" role="alert">{error}</p>}
          {loading ? <p className="empty">Loading tasks...</p> : <div className="task-list">{visibleTasks.length === 0 ? <p className="empty">No tasks found.</p> : <table className={`task-table ${showCompletionTime ? 'has-completion-time' : ''}`}><thead><tr><th>No</th><th>Assign Date</th><th>Software</th><th>Client</th><th>Task</th><th>Outcome Achieved</th><th>Note</th>{showCompletionTime && <th>Completion Date</th>}<th className="task-status-column">Status</th></tr></thead><tbody>{visibleTasks.map((task, index) => <TaskCard key={task._id} index={index + 1} task={task} statusMap={STATUS_MAP} onStatusChange={handleStatusChange} onDelete={(id, title) => setTaskToDelete({ id, title })} onEdit={(task) => { setEditingTask(task); setIsModalOpen(true); }} onViewHistory={setHistoryTask} showCompletionTime={showCompletionTime} isStatusUpdating={updatingStatusTaskId === task._id} />)}</tbody></table>}</div>}
        </section>
      </div>
      <TaskModal isOpen={isModalOpen} onClose={closeTaskModal} onSubmit={handleTaskSubmit} initialValues={editingTask || undefined} submitLabel={editingTask ? 'Update Task' : 'Create Task'} mode={editingTask ? 'edit' : 'create'} isSubmitting={isSubmittingTask} />
      <TaskHistoryModal isOpen={Boolean(historyTask)} task={historyTask} onClose={() => setHistoryTask(null)} />
      <DeleteConfirmModal isOpen={Boolean(taskToDelete)} taskTitle={taskToDelete?.title} onConfirm={confirmDelete} onCancel={() => setTaskToDelete(null)} />
      {toastMessage && <div className="toast" role="status">{toastMessage}</div>}
    </div>
  );
}

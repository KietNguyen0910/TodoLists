import { useCallback, useEffect, useRef, useState } from 'react';
import { createTask, getTasks, updateTask } from './api/tasks';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import GlobalSearch from './components/GlobalSearch';
import NotificationBell from './components/NotificationBell';
import ReportView from './components/ReportView';
import TaskCard from './components/TaskCard';
import TaskHistoryModal from './components/TaskHistoryModal';
import TaskModal from './components/TaskModal';
import { STATUS_MAP } from './statusConfig';

const TABS = [
  { id: 'todo', label: 'Todo List', title: 'Todo List', statuses: ['Initial Information Received', 'In Progress', 'Sent Report to client', 'On hold'] },
  { id: 'waiting', label: 'Waiting', title: 'Waiting Tasks', statuses: ['Waiting for review', 'Waiting client', 'Sent query for Manager'] },
  { id: 'completed', label: 'Completed', title: 'Completed Tasks', statuses: ['Lodged/Completed'] },
];
const REPORT_TAB = { id: 'report', label: 'Report', title: 'Report' };
const TAB_IDS = new Set([...TABS.map((tab) => tab.id), REPORT_TAB.id]);

const isActiveTask = (task) => !(task.deleted || task.isDeleted);
const WAITING_STATUSES = new Set(TABS.find((tab) => tab.id === 'waiting').statuses);
const NOTIFICATION_READ_KEY = 'todoApp.readWaitingNotifications';
const OVERDUE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function getDateTime(value) {
  if (!value) return 0;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortTasksForTab(tasks, tabId) {
  if (!['waiting', 'completed'].includes(tabId)) return tasks;

  return [...tasks].sort((first, second) => getDateTime(second.assignDate) - getDateTime(first.assignDate));
}

function getTaskTabId(status) {
  return TABS.find((tab) => tab.statuses.includes(status))?.id || null;
}

function getInitialTabId() {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return TAB_IDS.has(tab) ? tab : 'todo';
}

function isWaitingStatus(status) {
  return WAITING_STATUSES.has(status);
}

function getWaitingEnteredAt(task) {
  const history = Array.isArray(task.statusHistory) ? task.statusHistory : [];
  let enteredAt = null;
  let wasWaiting = false;

  history.forEach((entry) => {
    const isWaiting = isWaitingStatus(entry.status);
    if (isWaiting && !wasWaiting) {
      enteredAt = entry.changedAt;
    }
    wasWaiting = isWaiting;
  });

  return enteredAt || task.updatedAt || task.createdAt || task.assignDate;
}

function getNotificationId(task, waitingEnteredAt) {
  return `${task._id}:${waitingEnteredAt || 'unknown'}`;
}

function getOverdueWaitingNotifications(tasks) {
  const now = Date.now();

  return tasks
    .filter(isActiveTask)
    .filter((task) => isWaitingStatus(task.status))
    .map((task) => {
      const waitingEnteredAt = getWaitingEnteredAt(task);
      const waitingTime = getDateTime(waitingEnteredAt);
      const daysWaiting = waitingTime ? Math.floor((now - waitingTime) / DAY_MS) : 0;

      return {
        id: getNotificationId(task, waitingEnteredAt),
        task,
        waitingEnteredAt,
        daysWaiting,
      };
    })
    .filter((notification) => notification.daysWaiting >= OVERDUE_DAYS)
    .sort((first, second) => second.daysWaiting - first.daysWaiting);
}

function loadReadNotificationIds() {
  try {
    const value = window.localStorage.getItem(NOTIFICATION_READ_KEY);
    const ids = JSON.parse(value || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function saveReadNotificationIds(ids) {
  window.localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(ids));
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState(null);
  const [error, setError] = useState('');
  const [activeTabId, setActiveTabId] = useState(getInitialTabId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [readNotificationIds, setReadNotificationIds] = useState(loadReadNotificationIds);
  const [pendingScrollTaskId, setPendingScrollTaskId] = useState(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const taskRefs = useRef({});
  const toastTimer = useRef();
  const highlightTimer = useRef();

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
    return () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(highlightTimer.current);
    };
  }, [loadTasks]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTabId);
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;

    window.history.replaceState(null, '', nextUrl);
  }, [activeTabId]);

  const isReportTab = activeTabId === REPORT_TAB.id;
  const activeTab = isReportTab ? REPORT_TAB : TABS.find((tab) => tab.id === activeTabId) || TABS[0];
  const notifications = getOverdueWaitingNotifications(tasks);
  const unreadCount = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length;
  const showCompletionTime = activeTab.id === 'completed';
  const visibleTasks = isReportTab ? [] : sortTasksForTab(
    tasks.filter(isActiveTask).filter((task) => activeTab.statuses.includes(task.status)),
    activeTab.id
  );
  const searchableTasks = tasks.filter(isActiveTask).filter((task) => getTaskTabId(task.status));
  const getCount = (tab) => tasks.filter(isActiveTask).filter((task) => tab.statuses.includes(task.status)).length;

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const markNotificationsRead = () => {
    if (notifications.length === 0) return;

    setReadNotificationIds((currentIds) => {
      const nextIds = Array.from(new Set([...currentIds, ...notifications.map((notification) => notification.id)]));
      saveReadNotificationIds(nextIds);
      return nextIds;
    });
  };

  const scrollToTask = (taskOrId) => {
    const task = typeof taskOrId === 'string'
      ? tasks.find((item) => item._id === taskOrId)
      : taskOrId;
    const targetTabId = getTaskTabId(task?.status);

    if (!task || !targetTabId) return;

    setActiveTabId(targetTabId);
    setPendingScrollTaskId(task._id);
  };

  useEffect(() => {
    if (!pendingScrollTaskId || isReportTab) return;

    const taskElement = taskRefs.current[pendingScrollTaskId];
    if (!taskElement) return;

    taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedTaskId(pendingScrollTaskId);
    setPendingScrollTaskId(null);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightedTaskId(null), 2000);
  }, [activeTabId, isReportTab, pendingScrollTaskId, visibleTasks]);

  const handleTaskSubmit = async (taskData) => {
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
    setIsDeletingTask(true);
    try {
      await updateTask(taskToDelete.id, { deleted: true });
      showToast('Task deleted successfully.');
      await loadTasks();
    } catch {
      setError('Unable to delete task.');
    } finally {
      setIsDeletingTask(false);
      setTaskToDelete(null);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-title"><p className="eyebrow">Cassie Nguyen</p><h1>Daily Outcome-Based Updates</h1></div>
        <div className="header-actions">
          <GlobalSearch tasks={searchableTasks} onSelect={scrollToTask} />
          <NotificationBell notifications={notifications} unreadCount={unreadCount} onOpen={markNotificationsRead} onSelect={scrollToTask} />
          <button className="button-primary" type="button" onClick={() => { setEditingTask(null); setIsModalOpen(true); }}>Add Task</button>
        </div>
      </header>
      <div className="main-layout">
        <aside className="sidebar"><h2>Tabs</h2>{[...TABS, REPORT_TAB].map((tab) => <button key={tab.id} type="button" className={`sidebar-button ${activeTab.id === tab.id ? 'active' : ''}`} onClick={() => setActiveTabId(tab.id)}>{tab.label}{tab.id !== REPORT_TAB.id && <span className="task-count">({getCount(tab)})</span>}</button>)}</aside>
        <section className="content">
          {error && <p className="error" role="alert">{error}</p>}
          {isReportTab ? (
            loading ? <p className="empty">Loading tasks...</p> : <ReportView tasks={tasks} />
          ) : (
            <>
              <div className="content-header"><h2>{activeTab.title}</h2><span className="task-count">({visibleTasks.length})</span></div>
              {loading ? <p className="empty">Loading tasks...</p> : <div className="task-list">{visibleTasks.length === 0 ? <p className="empty">No tasks found.</p> : <table className={`task-table ${showCompletionTime ? 'has-completion-time' : ''}`}><thead><tr><th>No</th><th>Assign Date</th><th>Software</th><th>Client</th><th>Task</th><th>Outcome Achieved</th><th>Note</th><th className="payroll-column">Payroll</th>{showCompletionTime && <th>Completion Date</th>}<th className="task-status-column">Status</th></tr></thead><tbody>{visibleTasks.map((task, index) => <TaskCard key={task._id} taskRef={(element) => { taskRefs.current[task._id] = element; }} index={index + 1} task={task} statusMap={STATUS_MAP} onStatusChange={handleStatusChange} onDelete={(id, title) => setTaskToDelete({ id, title })} onEdit={(task) => { setEditingTask(task); setIsModalOpen(true); }} onViewHistory={setHistoryTask} showCompletionTime={showCompletionTime} isStatusUpdating={updatingStatusTaskId === task._id} isHighlighted={highlightedTaskId === task._id} />)}</tbody></table>}</div>}
            </>
          )}
        </section>
      </div>
      <TaskModal isOpen={isModalOpen} onClose={closeTaskModal} onSubmit={handleTaskSubmit} initialValues={editingTask || undefined} submitLabel={editingTask ? 'Update Task' : 'Create Task'} mode={editingTask ? 'edit' : 'create'} isSubmitting={isSubmittingTask} />
      <TaskHistoryModal isOpen={Boolean(historyTask)} task={historyTask} onClose={() => setHistoryTask(null)} />
      <DeleteConfirmModal isOpen={Boolean(taskToDelete)} taskTitle={taskToDelete?.title} onConfirm={confirmDelete} onCancel={() => setTaskToDelete(null)} isDeleting={isDeletingTask} />
      {updatingStatusTaskId && (
        <div className="status-loading-overlay" role="status" aria-live="polite">
          <div className="status-loading-card">
            <span className="loading-spinner" aria-hidden="true" />
            <span>Updating status...</span>
          </div>
        </div>
      )}
      {toastMessage && <div className="toast" role="status">{toastMessage}</div>}
    </div>
  );
}

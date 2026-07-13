import { useEffect, useRef, useState } from 'react';
import { createTask, deleteTasks, importTasks, updateClientTasks, updateTask } from './api/taskApi';
import { CLIENT_TAB, REPORT_TAB, TASK_TABS as TABS } from './app/tabs.config';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import ImportTasksModal from './components/ImportTasksModal';
import LoginModal from './components/LoginModal';
import ReportView from './components/ReportView';
import TaskHistoryModal from './components/TaskHistoryModal';
import TaskModal from './components/TaskModal';
import { useAuth } from './features/auth/hooks/useAuth';
import ClientView from './features/clients/components/ClientView';
import ClientModal from './features/clients/components/ClientModal';
import NotificationBell from './features/notifications/components/NotificationBell';
import { useWaitingNotifications } from './features/notifications/hooks/useWaitingNotifications';
import GlobalSearch from './features/search/components/GlobalSearch';
import TaskCard from './features/tasks/components/TaskCard';
import { getSearchableTasks, getTaskCountForTab, getTasksForTab } from './features/tasks/logic/taskFilters';
import { sortTasksForTab } from './features/tasks/logic/taskSorting';
import { useTasks } from './features/tasks/hooks/useTasks';
import { useTaskNavigation, useTaskTab } from './features/tasks/hooks/useTaskNavigation';
import { buildImportPreview, parseExcelFile } from './features/tasks/utils/excelImport';
import { downloadJobNewsTemplate } from './features/tasks/utils/jobNewsTemplate';
import { STATUS_MAP } from './shared/config/statusConfig';
import { useToast } from './shared/hooks/useToast';

export default function App() {
  const { tasks, setTasks, loading, error, setError, loadTasks } = useTasks();
  const { toastMessage, showToast } = useToast();
  const {
    auth,
    isAuthenticated,
    isLoggingIn,
    isLoginModalOpen,
    loginError,
    setIsLoginModalOpen,
    openLogin,
    handleLogin,
    handleLogout,
    requireLogin,
    expireSession,
  } = useAuth({ showToast });
  const { notifications, unreadCount, markNotificationsRead } = useWaitingNotifications(tasks);
  const { activeTabId, setActiveTabId } = useTaskTab();
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const selectAllCheckboxRef = useRef(null);

  const isReportTab = activeTabId === REPORT_TAB.id;
  const isClientTab = activeTabId === CLIENT_TAB.id;
  const isSpecialTab = isReportTab || isClientTab;
  const activeTab = isReportTab ? REPORT_TAB : isClientTab ? CLIENT_TAB : TABS.find((tab) => tab.id === activeTabId) || TABS[0];
  const showCompletionTime = activeTab.id === 'completed';
  const visibleTasks = isSpecialTab ? [] : sortTasksForTab(
    getTasksForTab(tasks, activeTab),
    activeTab.id
  );
  const searchableTasks = getSearchableTasks(tasks);
  const getCount = (tab) => getTaskCountForTab(tasks, tab);
  const visibleTaskIds = new Set(visibleTasks.map((task) => task._id));
  const selectedVisibleIds = selectedTaskIds.filter((taskId) => visibleTaskIds.has(taskId));
  const selectedTaskIdSet = new Set(selectedVisibleIds);
  const isAllVisibleSelected = visibleTasks.length > 0 && selectedVisibleIds.length === visibleTasks.length;
  const { highlightedTaskId, scrollToTask, taskRefs } = useTaskNavigation({
    tasks,
    activeTabId,
    setActiveTabId,
    isReportTab: isSpecialTab,
    visibleTasks,
  });

  useEffect(() => {
    setSelectedTaskIds([]);
  }, [activeTabId]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = selectedVisibleIds.length > 0 && !isAllVisibleSelected;
    }
  }, [isAllVisibleSelected, selectedVisibleIds.length]);

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const closeClientModal = () => {
    if (isSubmittingClient) return;
    setEditingClient(null);
  };

  const openImportDialog = () => {
    if (!requireLogin('import tasks')) return;
    setIsImportDialogOpen(true);
  };

  const handleImportFileSelection = async (file) => {
    if (!file) return;

    try {
      setError('');
      const parsedImport = await parseExcelFile(file);
      setImportPreview({
        ...buildImportPreview(parsedImport, tasks),
        fileName: file.name,
      });
    } catch {
      setError('Unable to read this Excel file. Please select a valid .xlsx or .xls file.');
    }
  };

  const closeImportDialog = () => {
    if (!isImporting) {
      setImportPreview(null);
      setIsImportDialogOpen(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || !requireLogin('import tasks')) return;

    setIsImporting(true);
    try {
      const result = await importTasks(importPreview.tasks);
      await loadTasks();
      setImportPreview(null);
      setIsImportDialogOpen(false);
      showToast(`Imported ${result.importedCount} task${result.importedCount === 1 ? '' : 's'}${result.skippedCount ? `; ${result.skippedCount} duplicate${result.skippedCount === 1 ? '' : 's'} skipped.` : '.'}`);
    } catch (requestError) {
      handleRequestError(requestError, 'Unable to import tasks.');
    } finally {
      setIsImporting(false);
    }
  };

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

  const handleClientSubmit = async ({ clientName, updates }) => {
    if (!requireLogin('edit clients') || Object.keys(updates).length === 0) return;

    setIsSubmittingClient(true);
    try {
      const result = await updateClientTasks(clientName, updates);
      await loadTasks();
      setEditingClient(null);
      showToast(result.updatedCount ? `Client updated across ${result.updatedCount} task${result.updatedCount === 1 ? '' : 's'}.` : 'No client changes were needed.');
    } catch (requestError) {
      handleRequestError(requestError, 'Unable to update client.');
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    if (!requireLogin('change task status')) return;

    setUpdatingStatusTaskId(taskId);
    try {
      await updateTask(taskId, { status });
      setSelectedTaskIds([]);
      if (status === 'Lodged/Completed') showToast('Task status updated to Lodged/Completed.');
      await loadTasks();
    } catch (requestError) {
      handleRequestError(requestError, 'Unable to update task.');
    } finally {
      setUpdatingStatusTaskId(null);
    }
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((currentIds) => (
      currentIds.includes(taskId)
        ? currentIds.filter((id) => id !== taskId)
        : [...currentIds, taskId]
    ));
  };

  const toggleAllTaskSelection = () => {
    setSelectedTaskIds(isAllVisibleSelected ? [] : visibleTasks.map((task) => task._id));
  };

  const requestBulkDelete = (taskIds) => {
    if (taskIds.length === 0 || !requireLogin('delete tasks')) return;
    setTaskToDelete({ ids: taskIds });
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    if (!requireLogin('delete tasks')) {
      setTaskToDelete(null);
      return;
    }

    setIsDeletingTask(true);
    try {
      const taskIds = taskToDelete.ids || [taskToDelete.id];
      if (taskIds.length === 1) {
        await updateTask(taskIds[0], { deleted: true });
      } else {
        await deleteTasks(taskIds);
      }
      setSelectedTaskIds([]);
      showToast(`${taskIds.length} task${taskIds.length === 1 ? '' : 's'} deleted successfully.`);
      await loadTasks();
    } catch (requestError) {
      handleRequestError(requestError, 'Unable to delete task.');
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
          {isAuthenticated ? (
            <button className="button-secondary auth-button" type="button" onClick={handleLogout}>Logout {auth.user?.label || auth.user?.username}</button>
          ) : (
            <button className="button-secondary auth-button" type="button" onClick={openLogin}>Login</button>
          )}
          <button className="button-primary" type="button" onClick={() => { if (!requireLogin('add tasks')) return; setEditingTask(null); setIsModalOpen(true); }}>Add Task</button>
        </div>
      </header>
      <div className="main-layout">
        <aside className="sidebar">
          <h2>Tabs</h2>
          {[...TABS, REPORT_TAB, CLIENT_TAB].map((tab) => <button key={tab.id} type="button" className={`sidebar-button ${activeTab.id === tab.id ? 'active' : ''}`} onClick={() => { setSelectedTaskIds([]); setActiveTabId(tab.id); }}>{tab.label}{TABS.some((taskTab) => taskTab.id === tab.id) && <span className="task-count">({getCount(tab)})</span>}</button>)}
          <div className="sidebar-import">
            <button className="sidebar-button import-button" type="button" onClick={openImportDialog}>Import Excel</button>
          </div>
        </aside>
        <section className="content">
          {error && <p className="error" role="alert">{error}</p>}
          {isReportTab ? (
            loading ? <p className="empty">Loading tasks...</p> : <ReportView tasks={tasks} />
          ) : isClientTab ? (
            loading ? <p className="empty">Loading clients...</p> : <ClientView tasks={tasks} onEdit={setEditingClient} onRequireLogin={requireLogin} isReadOnly={!isAuthenticated} />
          ) : (
            <>
              <div className="content-header">
                <div className="flex gap-1 content-title"><h2>{activeTab.title}</h2><span className="task-count">({visibleTasks.length})</span></div>
                <div className="bulk-actions">
                  <button className="bulk-delete-button" type="button" disabled={selectedVisibleIds.length === 0} onClick={() => requestBulkDelete(selectedVisibleIds)}>Delete selected ({selectedVisibleIds.length})</button>
                  <button className="bulk-delete-button" type="button" disabled={visibleTasks.length === 0} onClick={() => requestBulkDelete(visibleTasks.map((task) => task._id))}>Delete all ({visibleTasks.length})</button>
                </div>
              </div>
              {loading ? <p className="empty">Loading tasks...</p> : <div className="task-list">{visibleTasks.length === 0 ? <p className="empty">No tasks found.</p> : <table className={`task-table ${showCompletionTime ? 'has-completion-time' : ''}`}><thead><tr><th className="task-select-column"><input ref={selectAllCheckboxRef} type="checkbox" checked={isAllVisibleSelected} onChange={toggleAllTaskSelection} aria-label={`Select all tasks in ${activeTab.title}`} /></th><th>No</th><th>Assign Date</th><th>Software</th><th>Client</th><th>Task</th><th className="outcome-column">Outcome Achieved</th><th className="note-column">Note</th><th className="payroll-column">Payroll</th><th>Property</th><th>Motor Vehicle</th>{showCompletionTime && <th>Completion Date</th>}<th className="task-status-column">Status</th></tr></thead><tbody>{visibleTasks.map((task, index) => <TaskCard key={task._id} taskRef={(element) => { taskRefs.current[task._id] = element; }} index={index + 1} task={task} isSelected={selectedTaskIdSet.has(task._id)} onSelect={toggleTaskSelection} statusMap={STATUS_MAP} onStatusChange={handleStatusChange} onDelete={(id, title) => setTaskToDelete({ ids: [id], title })} onEdit={(task) => { if (!requireLogin('edit tasks')) return; setEditingTask(task); setIsModalOpen(true); }} onViewHistory={setHistoryTask} onRequireLogin={requireLogin} showCompletionTime={showCompletionTime} hideEmptyOutcomeProgress={activeTab.id === 'completed'} isStatusUpdating={updatingStatusTaskId === task._id} isHighlighted={highlightedTaskId === task._id} isReadOnly={!isAuthenticated} />)}</tbody></table>}</div>}
            </>
          )}
        </section>
      </div>
      <TaskModal isOpen={isModalOpen} onClose={closeTaskModal} onSubmit={handleTaskSubmit} initialValues={editingTask || undefined} submitLabel={editingTask ? 'Update Task' : 'Create Task'} mode={editingTask ? 'edit' : 'create'} isSubmitting={isSubmittingTask} />
      <ClientModal isOpen={Boolean(editingClient)} client={editingClient} onClose={closeClientModal} onSubmit={handleClientSubmit} isSubmitting={isSubmittingClient} />
      <ImportTasksModal isOpen={isImportDialogOpen} preview={importPreview} onClose={closeImportDialog} onConfirm={confirmImport} onFileSelected={handleImportFileSelection} onDownloadTemplate={downloadJobNewsTemplate} isImporting={isImporting} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onSubmit={handleLogin} isSubmitting={isLoggingIn} error={loginError} />
      <TaskHistoryModal isOpen={Boolean(historyTask)} task={historyTask} onClose={() => setHistoryTask(null)} />
      <DeleteConfirmModal isOpen={Boolean(taskToDelete)} taskTitle={taskToDelete?.title} taskCount={taskToDelete?.ids?.length || 1} onConfirm={confirmDelete} onCancel={() => setTaskToDelete(null)} isDeleting={isDeletingTask} />
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

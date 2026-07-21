import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CLIENT_TAB, REPORT_TAB, TASK_TABS as TABS } from './app/tabs.config';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import LoginModal from './components/LoginModal';
import SoftwareSyncConfirmModal from './components/SoftwareSyncConfirmModal';
import TaskHistoryModal from './components/TaskHistoryModal';
import TaskModal from './components/TaskModal';
import { useAuth } from './features/auth/hooks/useAuth';
import { getClientSoftwareByName, getClientSyncCount } from './features/clients/logic/softwareSync';
import ClientModal from './features/clients/components/ClientModal';
import NotificationBell from './features/notifications/components/NotificationBell';
import { useWaitingNotifications } from './features/notifications/hooks/useWaitingNotifications';
import GlobalSearch from './features/search/components/GlobalSearch';
import TaskCard from './features/tasks/components/TaskCard';
import TaskTableSkeleton from './features/tasks/components/TaskTableSkeleton';
import { getSearchableTasks, getTaskCountForTab, getTasksForTab, isActiveTask } from './features/tasks/logic/taskFilters';
import { getDailyBackupDate, getDailyBackupFilename, hasDailyBackup, markDailyBackup } from './features/tasks/utils/dailyBackup';
import { getEmptyTaskTableColumnClasses } from './features/tasks/logic/taskTableLayout';
import { getTaskRangeIds } from './features/tasks/logic/taskSelection';
import { getDefaultTaskSortMode, sortTasksForTab, TASK_SORT_MODES } from './features/tasks/logic/taskSorting';
import { useTasks } from './features/tasks/hooks/useTasks';
import { TASKS_QUERY_KEY } from './features/tasks/hooks/useTasks';
import { useTaskNavigation, useTaskTab } from './features/tasks/hooks/useTaskNavigation';
import { buildImportPreview, parseExcelFile } from './features/tasks/utils/excelImport';
import { exportDailyOutcomeTasks } from './features/tasks/utils/dailyOutcomeExport';
import { STATUS_MAP } from './shared/config/statusConfig';
import { useToast } from './shared/hooks/useToast';

const CLIENT_SYNC_FIELDS = ['software', 'payroll', 'properties', 'motorVehicles'];
const ClientView = lazy(() => import('./features/clients/components/ClientView'));
const ImportTasksModal = lazy(() => import('./components/ImportTasksModal'));
const ReportView = lazy(() => import('./components/ReportView'));
const CLIENT_SYNC_LABELS = {
  software: 'Software',
  payroll: 'Payroll',
  properties: 'Property',
  motorVehicles: 'Motor Vehicle',
};
const valuesMatch = (first, second) => JSON.stringify(first ?? null) === JSON.stringify(second ?? null);

export default function App() {
  const { tasks, loading, error, setError, mutations } = useTasks();
  const queryClient = useQueryClient();
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
  const [isExportingTasks, setIsExportingTasks] = useState(false);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [pendingSoftwareSync, setPendingSoftwareSync] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectionAnchorTaskId, setSelectionAnchorTaskId] = useState(null);
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);
  const [autoAssignReadyToken, setAutoAssignReadyToken] = useState(null);
  const [taskSortMode, setTaskSortMode] = useState('');
  const selectAllCheckboxRef = useRef(null);
  const autoAssignSessionRef = useRef(null);
  const autoBackupDayRef = useRef(null);

  const clearTaskCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: TASKS_QUERY_KEY });
  }, [queryClient]);

  const handleLogoutAndClearCache = useCallback(() => {
    clearTaskCache();
    handleLogout();
  }, [clearTaskCache, handleLogout]);

  const expireSessionAndClearCache = useCallback(() => {
    clearTaskCache();
    expireSession();
  }, [clearTaskCache, expireSession]);

  const isReportTab = activeTabId === REPORT_TAB.id;
  const isClientTab = activeTabId === CLIENT_TAB.id;
  const isSpecialTab = isReportTab || isClientTab;
  const activeTab = isReportTab ? REPORT_TAB : isClientTab ? CLIENT_TAB : TABS.find((tab) => tab.id === activeTabId) || TABS[0];
  const showCompletionTime = activeTab.id === 'completed';
  const activeTaskSortMode = taskSortMode || getDefaultTaskSortMode(activeTab.id);
  const visibleTasks = useMemo(() => (isSpecialTab ? [] : sortTasksForTab(
    getTasksForTab(tasks, activeTab),
    activeTab.id,
    activeTaskSortMode
  )), [activeTab, activeTaskSortMode, isSpecialTab, tasks]);
  const emptyTaskTableColumnClasses = useMemo(
    () => getEmptyTaskTableColumnClasses(visibleTasks, showCompletionTime),
    [showCompletionTime, visibleTasks]
  );
  const searchableTasks = useMemo(() => getSearchableTasks(tasks), [tasks]);
  const clientSoftwareByName = useMemo(() => getClientSoftwareByName(tasks), [tasks]);
  const getCount = useCallback((tab) => getTaskCountForTab(tasks, tab), [tasks]);
  const visibleTaskIds = useMemo(() => new Set(visibleTasks.map((task) => task._id)), [visibleTasks]);
  const selectedVisibleIds = useMemo(
    () => selectedTaskIds.filter((taskId) => visibleTaskIds.has(taskId)),
    [selectedTaskIds, visibleTaskIds]
  );
  const selectedTaskIdSet = useMemo(() => new Set(selectedVisibleIds), [selectedVisibleIds]);
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
    setSelectionAnchorTaskId(null);
    setTaskSortMode('');
  }, [activeTabId]);

  useEffect(() => {
    if (!isAuthenticated) {
      autoAssignSessionRef.current = null;
      setAutoAssignReadyToken(null);
      return;
    }
    if (loading || autoAssignSessionRef.current === auth?.token) return;

    const sessionToken = auth?.token;
    autoAssignSessionRef.current = sessionToken;
    setAutoAssignReadyToken(null);
    const assignInitialTasks = async () => {
      try {
        const result = await mutations.autoAssignTasks();
        if (!result.assignedCount) return;

        showToast(`Automatically assigned ${result.assignedCount} task${result.assignedCount === 1 ? '' : 's'} to In Progress.`);
      } catch (requestError) {
        if (requestError?.status === 401) expireSessionAndClearCache();
      } finally {
        setAutoAssignReadyToken(sessionToken);
      }
    };

    assignInitialTasks();
  }, [auth?.token, expireSessionAndClearCache, isAuthenticated, loading, mutations, showToast]);

  useEffect(() => {
    if (loading || error || (isAuthenticated && autoAssignReadyToken !== auth?.token)) return;

    const backupDate = new Date();
    const backupDay = getDailyBackupDate(backupDate);
    if (autoBackupDayRef.current === backupDay) return;
    if (hasDailyBackup(backupDate)) {
      autoBackupDayRef.current = backupDay;
      return;
    }

    autoBackupDayRef.current = backupDay;
    const createDailyBackup = async () => {
      try {
        const activeTasks = tasks.filter(isActiveTask);
        await exportDailyOutcomeTasks(activeTasks, 'backup', {
          filename: getDailyBackupFilename(backupDate),
          allowEmpty: true,
        });
        markDailyBackup(backupDate);
        showToast(`Daily backup downloaded (${activeTasks.length} task${activeTasks.length === 1 ? '' : 's'}).`);
      } catch (backupError) {
        autoBackupDayRef.current = null;
        console.error('Daily backup error:', backupError);
        showToast('Daily backup could not be downloaded. It will retry when you next open the app.');
      }
    };

    createDailyBackup();
  }, [auth?.token, autoAssignReadyToken, error, isAuthenticated, loading, showToast, tasks]);

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
      const result = await mutations.importTasks(importPreview.tasks);
      setImportPreview(null);
      setIsImportDialogOpen(false);
      showToast(`Imported ${result.importedCount} task${result.importedCount === 1 ? '' : 's'}${result.skippedCount ? `; ${result.skippedCount} duplicate${result.skippedCount === 1 ? '' : 's'} skipped` : ''}${result.autoAssignedCount ? `; ${result.autoAssignedCount} auto-assigned to In Progress` : ''}.`);
    } catch (requestError) {
      handleRequestError(requestError, 'Unable to import tasks.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRequestError = useCallback((requestError, fallbackMessage) => {
    if (requestError?.status === 401) {
      expireSessionAndClearCache();
      return;
    }

    setError(fallbackMessage);
  }, [expireSessionAndClearCache, setError]);

  const submitTask = async (taskData, syncClientFields = []) => {
    if (!requireLogin(editingTask ? 'update tasks' : 'add tasks')) return;

    setIsSubmittingTask(true);
    try {
      if (editingTask) {
        const result = await mutations.updateTask(editingTask._id, { ...taskData, syncClientFields });
        showToast(syncClientFields.length ? `Task updated; client fields synced across ${result.updatedCount} task${result.updatedCount === 1 ? '' : 's'}.` : 'Task updated successfully.');
      } else {
        const result = await mutations.createTask({ ...taskData, syncSoftwareForClient: syncClientFields.includes('software') });
        showToast(syncClientFields.length ? `Task created; software synced across ${result.updatedCount} task${result.updatedCount === 1 ? '' : 's'}.` : 'Task created successfully.');
      }
      closeTaskModal();
    } catch (requestError) {
      handleRequestError(requestError, editingTask ? 'Unable to update task.' : 'Unable to create task.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleTaskSubmit = (taskData) => {
    if (!requireLogin(editingTask ? 'update tasks' : 'add tasks')) return;

    const syncClientFields = editingTask
      ? CLIENT_SYNC_FIELDS.filter((field) => !valuesMatch(taskData[field], editingTask[field]))
      : ['software'];
    const syncUpdates = Object.fromEntries(syncClientFields.map((field) => [field, taskData[field]]));
    const taskCount = syncClientFields.length ? getClientSyncCount(tasks, taskData.title, syncUpdates, editingTask?._id) : 0;
    if (taskCount > 0) {
      setPendingSoftwareSync({ type: 'task', taskData, clientName: taskData.title.trim(), fields: syncClientFields, taskCount });
      return;
    }

    submitTask(taskData);
  };

  const submitClientUpdate = async ({ clientName, updates }) => {
    if (!requireLogin('edit clients') || Object.keys(updates).length === 0) return;

    setIsSubmittingClient(true);
    try {
      const result = await mutations.updateClientTasks(clientName, updates);
      setEditingClient(null);
      showToast(result.updatedCount ? `Client updated across ${result.updatedCount} task${result.updatedCount === 1 ? '' : 's'}.` : 'No client changes were needed.');
    } catch (requestError) {
      handleRequestError(requestError, 'Unable to update client.');
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const handleClientSubmit = ({ clientName, updates }) => {
    if (!requireLogin('edit clients') || Object.keys(updates).length === 0) return;

    const fields = CLIENT_SYNC_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(updates, field));
    const syncUpdates = Object.fromEntries(fields.map((field) => [field, updates[field]]));
    const taskCount = fields.length ? getClientSyncCount(tasks, clientName, syncUpdates) : 0;
    if (taskCount > 0) {
      setPendingSoftwareSync({ type: 'client', clientName, updates, fields, taskCount });
      return;
    }

    submitClientUpdate({ clientName, updates });
  };

  const confirmSoftwareSync = async () => {
    const pendingSync = pendingSoftwareSync;
    if (!pendingSync) return;

    if (pendingSync.type === 'task') {
      await submitTask(pendingSync.taskData, pendingSync.fields);
    } else {
      await submitClientUpdate(pendingSync);
    }
    setPendingSoftwareSync(null);
  };

  const handleTaskTableExport = async () => {
    if (!visibleTasks.length || isExportingTasks) return;

    setIsExportingTasks(true);
    try {
      await exportDailyOutcomeTasks(visibleTasks, activeTab.title);
      showToast(`Exported ${visibleTasks.length} task${visibleTasks.length === 1 ? '' : 's'} to Excel.`);
    } catch (exportError) {
      console.error('Daily Outcome Updates export error:', exportError);
      setError('Unable to export the Daily Outcome Updates file.');
    } finally {
      setIsExportingTasks(false);
    }
  };

  const handleDownloadImportTemplate = useCallback(async () => {
    const { downloadJobNewsTemplate } = await import('./features/tasks/utils/jobNewsTemplate');
    downloadJobNewsTemplate();
  }, []);

  const handleStatusChange = useCallback(async (taskId, status) => {
    if (!requireLogin('change task status')) return;

    const taskIds = selectedTaskIdSet.has(taskId) && selectedVisibleIds.length > 1 ? selectedVisibleIds : [taskId];
    if (taskIds.length > 1) setIsBulkStatusUpdating(true);
    else setUpdatingStatusTaskId(taskId);
    try {
      const result = taskIds.length > 1
        ? await mutations.updateTasksStatus(taskIds, status)
        : await mutations.updateTask(taskId, { status });
      setSelectedTaskIds([]);
      setSelectionAnchorTaskId(null);
      if (taskIds.length > 1) showToast(`Status updated for ${result.updatedCount} task${result.updatedCount === 1 ? '' : 's'}.`);
      else if (status === 'Lodged/Completed') showToast('Task status updated to Lodged/Completed.');
    } catch (requestError) {
      handleRequestError(requestError, 'Unable to update task.');
    } finally {
      setUpdatingStatusTaskId(null);
      setIsBulkStatusUpdating(false);
    }
  }, [handleRequestError, mutations, requireLogin, selectedTaskIdSet, selectedVisibleIds, showToast]);

  const toggleTaskSelection = useCallback((taskId, event) => {
    if (event?.shiftKey && (event?.ctrlKey || event?.metaKey) && selectionAnchorTaskId) {
      const rangeIds = getTaskRangeIds(visibleTasks, selectionAnchorTaskId, taskId);
      if (rangeIds.length > 0) {
        setSelectedTaskIds((currentIds) => Array.from(new Set([...currentIds, ...rangeIds])));
        setSelectionAnchorTaskId(taskId);
        return;
      }
    }

    setSelectedTaskIds((currentIds) => (
      currentIds.includes(taskId)
        ? currentIds.filter((id) => id !== taskId)
        : [...currentIds, taskId]
    ));
    setSelectionAnchorTaskId(taskId);
  }, [selectionAnchorTaskId, visibleTasks]);

  const toggleAllTaskSelection = () => {
    setSelectedTaskIds(isAllVisibleSelected ? [] : visibleTasks.map((task) => task._id));
    setSelectionAnchorTaskId(isAllVisibleSelected ? null : visibleTasks[0]?._id || null);
  };

  const requestBulkDelete = (taskIds) => {
    if (taskIds.length === 0 || !requireLogin('delete tasks')) return;
    setTaskToDelete({ ids: taskIds });
  };

  const requestSingleTaskDelete = useCallback((id, title) => {
    setTaskToDelete({ ids: [id], title });
  }, []);

  const openTaskForEdit = useCallback((task) => {
    if (!requireLogin('edit tasks')) return;
    setEditingTask(task);
    setIsModalOpen(true);
  }, [requireLogin]);

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
        await mutations.updateTask(taskIds[0], { deleted: true });
      } else {
        await mutations.deleteTasks(taskIds);
      }
      setSelectedTaskIds([]);
      setSelectionAnchorTaskId(null);
      showToast(`${taskIds.length} task${taskIds.length === 1 ? '' : 's'} deleted successfully.`);
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
            <button className="button-secondary auth-button" type="button" onClick={handleLogoutAndClearCache}>Logout {auth.user?.label || auth.user?.username}</button>
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
            loading ? <p className="empty">Loading tasks...</p> : <Suspense fallback={<p className="empty">Loading report...</p>}><ReportView tasks={tasks} /></Suspense>
          ) : isClientTab ? (
            loading ? <p className="empty">Loading clients...</p> : <Suspense fallback={<p className="empty">Loading clients...</p>}><ClientView tasks={tasks} onEdit={setEditingClient} onRequireLogin={requireLogin} isReadOnly={!isAuthenticated} /></Suspense>
          ) : (
            <>
              <div className="content-header">
                <div className="flex gap-1 content-title"><h2>{activeTab.title}</h2><span className="task-count">({visibleTasks.length})</span></div>
                <div className="bulk-actions">
                  <button className="bulk-delete-button" type="button" disabled={selectedVisibleIds.length === 0} onClick={() => requestBulkDelete(selectedVisibleIds)}>Delete selected ({selectedVisibleIds.length})</button>
                  <button className="bulk-delete-button" type="button" disabled={visibleTasks.length === 0} onClick={() => requestBulkDelete(visibleTasks.map((task) => task._id))}>Delete all ({visibleTasks.length})</button>
                </div>
              </div>
              <div className="task-table-toolbar">
                <label>Sort by
                  <select value={activeTaskSortMode} onChange={(event) => setTaskSortMode(event.target.value)}>
                    <option value={TASK_SORT_MODES.STATUS}>{activeTab.id === 'todo' ? 'Status (In Progress first)' : 'Status (grouped)'}</option>
                    <option value={TASK_SORT_MODES.DATE_DESC}>{showCompletionTime ? 'Completion date: Newest first' : 'Assign date: Newest first'}</option>
                    <option value={TASK_SORT_MODES.DATE_ASC}>{showCompletionTime ? 'Completion date: Oldest first' : 'Assign date: Oldest first'}</option>
                    <option value={TASK_SORT_MODES.CLIENT}>Client name (A-Z)</option>
                    <option value={TASK_SORT_MODES.TASK}>Task (A-Z)</option>
                  </select>
                </label>
              </div>
              {loading ? <TaskTableSkeleton showCompletionTime={showCompletionTime} /> : <div className="task-list">{visibleTasks.length === 0 ? <p className="empty">No tasks found.</p> : <table className={`task-table ${showCompletionTime ? 'has-completion-time' : ''} ${emptyTaskTableColumnClasses}`}><thead><tr><th className="task-select-column"><input ref={selectAllCheckboxRef} type="checkbox" checked={isAllVisibleSelected} onChange={toggleAllTaskSelection} aria-label={`Select all tasks in ${activeTab.title}`} /></th><th>No</th><th>Assign Date</th><th>Software</th><th>Client</th><th>Task</th><th className="payroll-column">Payroll</th><th>Property</th><th>Motor Vehicle</th><th className="outcome-column">Outcome Achieved</th><th className="note-column">Note</th>{showCompletionTime && <th>Completion Date</th>}<th className="task-status-column">Status</th></tr></thead><tbody>{visibleTasks.map((task, index) => <TaskCard key={task._id} taskRefs={taskRefs} index={index + 1} task={task} isSelected={selectedTaskIdSet.has(task._id)} onSelect={toggleTaskSelection} statusMap={STATUS_MAP} onStatusChange={handleStatusChange} onDelete={requestSingleTaskDelete} onEdit={openTaskForEdit} onViewHistory={setHistoryTask} onRequireLogin={requireLogin} showCompletionTime={showCompletionTime} hideEmptyOutcomeProgress={activeTab.id === 'completed'} isStatusUpdating={isBulkStatusUpdating || updatingStatusTaskId === task._id} isHighlighted={highlightedTaskId === task._id} isReadOnly={!isAuthenticated} useNeutralRowBackground={activeTab.id === 'information-received' || (activeTab.id === 'todo' && task.status === 'On hold')} />)}</tbody></table>}</div>}
              {!loading && (
                <div className="task-table-export-actions">
                  <button className="button-primary" type="button" disabled={visibleTasks.length === 0 || isExportingTasks} onClick={handleTaskTableExport}>
                    {isExportingTasks ? 'Preparing Excel...' : 'Export Excel'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <TaskModal isOpen={isModalOpen} onClose={closeTaskModal} onSubmit={handleTaskSubmit} initialValues={editingTask || undefined} clientSoftwareByName={clientSoftwareByName} submitLabel={editingTask ? 'Update Task' : 'Create Task'} mode={editingTask ? 'edit' : 'create'} isSubmitting={isSubmittingTask} />
      <ClientModal isOpen={Boolean(editingClient)} client={editingClient} onClose={closeClientModal} onSubmit={handleClientSubmit} isSubmitting={isSubmittingClient} />
      {isImportDialogOpen && <Suspense fallback={null}><ImportTasksModal isOpen preview={importPreview} onClose={closeImportDialog} onConfirm={confirmImport} onFileSelected={handleImportFileSelection} onDownloadTemplate={handleDownloadImportTemplate} isImporting={isImporting} /></Suspense>}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onSubmit={handleLogin} isSubmitting={isLoggingIn} error={loginError} />
      <TaskHistoryModal isOpen={Boolean(historyTask)} task={historyTask} onClose={() => setHistoryTask(null)} />
      <DeleteConfirmModal isOpen={Boolean(taskToDelete)} taskTitle={taskToDelete?.title} taskCount={taskToDelete?.ids?.length || 1} onConfirm={confirmDelete} onCancel={() => setTaskToDelete(null)} isDeleting={isDeletingTask} />
      <SoftwareSyncConfirmModal isOpen={Boolean(pendingSoftwareSync)} clientName={pendingSoftwareSync?.clientName || ''} fields={(pendingSoftwareSync?.fields || []).map((field) => CLIENT_SYNC_LABELS[field])} taskCount={pendingSoftwareSync?.taskCount || 0} onConfirm={confirmSoftwareSync} onCancel={() => setPendingSoftwareSync(null)} isSubmitting={isSubmittingTask || isSubmittingClient} />
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

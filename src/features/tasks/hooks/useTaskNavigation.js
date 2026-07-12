import { useEffect, useRef, useState } from 'react';
import { TAB_IDS } from '../../../app/tabs.config';
import { getTaskTabId } from '../logic/taskFilters';

export function getInitialTabId() {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return TAB_IDS.has(tab) ? tab : 'todo';
}

export function useTaskNavigation({ tasks, isReportTab, visibleTasks }) {
  const [activeTabId, setActiveTabId] = useState(getInitialTabId);
  const [pendingScrollTaskId, setPendingScrollTaskId] = useState(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const taskRefs = useRef({});
  const highlightTimer = useRef();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTabId);
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;

    window.history.replaceState(null, '', nextUrl);
  }, [activeTabId]);

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

  useEffect(() => () => {
    window.clearTimeout(highlightTimer.current);
  }, []);

  return {
    activeTabId,
    setActiveTabId,
    highlightedTaskId,
    scrollToTask,
    taskRefs,
  };
}

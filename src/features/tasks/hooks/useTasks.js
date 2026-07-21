import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  autoAssignTasks,
  createTask,
  deleteTasks,
  getTasks,
  importTasks,
  updateClientTasks,
  updateTask,
  updateTasksStatus,
} from '../../../api/taskApi';

export const TASKS_QUERY_KEY = ['tasks'];

const isSameClient = (first, second) => String(first || '').trim().toLocaleLowerCase() === String(second || '').trim().toLocaleLowerCase();
const taskId = (task) => task?._id;
let optimisticTaskSequence = 0;
const createOptimisticId = (prefix) => `${prefix}-${Date.now()}-${++optimisticTaskSequence}`;

function getAffectedTasks(result) {
  const tasks = [
    ...(taskId(result) ? [result] : []),
    ...(result?.task ? [result.task] : []),
    ...(Array.isArray(result?.tasks) ? result.tasks : []),
    ...(Array.isArray(result?.autoAssignedTasks) ? result.autoAssignedTasks : []),
  ];
  const taskById = new Map();
  tasks.forEach((task) => {
    if (taskId(task)) taskById.set(taskId(task), task);
  });
  return [...taskById.values()];
}

function mergeTasks(currentTasks = [], affectedTasks = []) {
  const updates = new Map(affectedTasks.map((task) => [taskId(task), task]));
  const merged = currentTasks.map((task) => updates.get(taskId(task)) || task);
  affectedTasks.forEach((task) => {
    if (!currentTasks.some((currentTask) => taskId(currentTask) === taskId(task))) merged.push(task);
  });
  return merged;
}

function useOptimisticTaskMutation(options) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks = queryClient.getQueryData(TASKS_QUERY_KEY) || [];
      const optimisticContext = options.optimisticUpdate?.(previousTasks, variables) || {};
      if (optimisticContext.tasks) queryClient.setQueryData(TASKS_QUERY_KEY, optimisticContext.tasks);
      return { previousTasks, ...optimisticContext };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTasks) queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
    },
    onSuccess: (result, _variables, context) => {
      queryClient.setQueryData(TASKS_QUERY_KEY, (currentTasks = []) => {
        const withoutTemporaryTasks = context?.temporaryIds?.length
          ? currentTasks.filter((task) => !context.temporaryIds.includes(taskId(task)))
          : currentTasks;
        return mergeTasks(withoutTemporaryTasks, getAffectedTasks(result));
      });
    },
  });
}

export function useTasks() {
  const [localError, setLocalError] = useState('');
  const tasksQuery = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: ({ signal }) => getTasks({ signal }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchInterval: false,
  });

  const createTaskMutation = useOptimisticTaskMutation({
    mutationFn: createTask,
    optimisticUpdate: (tasks, task) => {
      const temporaryId = createOptimisticId('optimistic-task');
      const createdAt = new Date().toISOString();
      return {
        temporaryIds: [temporaryId],
        tasks: [...tasks, {
          ...task,
          _id: temporaryId,
          status: task.status || 'Initial Information Received',
          createdAt,
          updatedAt: createdAt,
          __optimistic: true,
        }],
      };
    },
  });

  const updateTaskMutation = useOptimisticTaskMutation({
    mutationFn: ({ taskId: id, changes }) => updateTask(id, changes),
    optimisticUpdate: (tasks, { taskId: id, changes }) => ({
      tasks: tasks.map((task) => taskId(task) === id
        ? { ...task, ...changes, completionDate: changes.status === 'Lodged/Completed' ? new Date().toISOString() : task.completionDate, __optimistic: true }
        : task),
    }),
  });

  const updateClientMutation = useOptimisticTaskMutation({
    mutationFn: ({ clientName, updates }) => updateClientTasks(clientName, updates),
    optimisticUpdate: (tasks, { clientName, updates }) => ({
      tasks: tasks.map((task) => isSameClient(task.title, clientName) ? { ...task, ...updates, __optimistic: true } : task),
    }),
  });

  const importTasksMutation = useOptimisticTaskMutation({
    mutationFn: importTasks,
    optimisticUpdate: (tasks, importedTasks) => {
      const createdAt = new Date().toISOString();
      const temporaryTasks = importedTasks.map((task, index) => ({
        ...task,
        _id: createOptimisticId(`optimistic-import-${index}`),
        createdAt,
        updatedAt: createdAt,
        __optimistic: true,
      }));
      return {
        temporaryIds: temporaryTasks.map(taskId),
        tasks: [...tasks, ...temporaryTasks],
      };
    },
  });

  const deleteTasksMutation = useOptimisticTaskMutation({
    mutationFn: deleteTasks,
    optimisticUpdate: (tasks, ids) => ({ tasks: tasks.filter((task) => !ids.includes(taskId(task))) }),
  });

  const updateStatusMutation = useOptimisticTaskMutation({
    mutationFn: ({ taskIds, status }) => updateTasksStatus(taskIds, status),
    optimisticUpdate: (tasks, { taskIds, status }) => ({
      tasks: tasks.map((task) => taskIds.includes(taskId(task))
        ? { ...task, status, completionDate: status === 'Lodged/Completed' ? new Date().toISOString() : task.completionDate, __optimistic: true }
        : task),
    }),
  });

  const autoAssignMutation = useOptimisticTaskMutation({ mutationFn: autoAssignTasks });

  const mutations = useMemo(() => ({
    createTask: createTaskMutation.mutateAsync,
    updateTask: (id, changes) => updateTaskMutation.mutateAsync({ taskId: id, changes }),
    updateClientTasks: (clientName, updates) => updateClientMutation.mutateAsync({ clientName, updates }),
    importTasks: importTasksMutation.mutateAsync,
    deleteTasks: deleteTasksMutation.mutateAsync,
    updateTasksStatus: (taskIds, status) => updateStatusMutation.mutateAsync({ taskIds, status }),
    autoAssignTasks: autoAssignMutation.mutateAsync,
  }), [
    autoAssignMutation.mutateAsync,
    createTaskMutation.mutateAsync,
    deleteTasksMutation.mutateAsync,
    importTasksMutation.mutateAsync,
    updateClientMutation.mutateAsync,
    updateStatusMutation.mutateAsync,
    updateTaskMutation.mutateAsync,
  ]);

  const setError = useCallback((message) => setLocalError(message), []);
  const error = localError || (tasksQuery.error ? 'Unable to load tasks.' : '');

  return {
    tasks: tasksQuery.data || [],
    loading: tasksQuery.isPending,
    error,
    setError,
    mutations,
  };
}

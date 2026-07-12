import { useCallback, useEffect, useState } from 'react';
import { getTasks } from '../../../api/taskApi';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, [loadTasks]);

  return { tasks, setTasks, loading, error, setError, loadTasks };
}

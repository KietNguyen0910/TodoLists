import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast(duration = 3000) {
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef();

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = window.setTimeout(() => setToastMessage(''), duration);
  }, [duration]);

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current);
  }, []);

  return { toastMessage, showToast };
}

import { useCallback, useState } from 'react';
import { login as loginRequest } from '../../../api/authApi';
import { clearStoredAuth, getStoredAuth } from '../utils/authStorage';

export function useAuth({ showToast } = {}) {
  const [auth, setAuth] = useState(getStoredAuth);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const isAuthenticated = Boolean(auth?.token);

  const openLogin = useCallback(() => {
    setLoginError('');
    setIsLoginModalOpen(true);
  }, []);

  const handleLogin = useCallback(async (username, password) => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const nextAuth = await loginRequest(username, password);
      setAuth(nextAuth);
      setIsLoginModalOpen(false);
      showToast?.(`Logged in as ${nextAuth.user?.label || nextAuth.user?.username || 'User'}.`);
    } catch (error) {
      setLoginError(error.message || 'Unable to login.');
    } finally {
      setIsLoggingIn(false);
    }
  }, [showToast]);

  const handleLogout = useCallback(() => {
    clearStoredAuth();
    setAuth(null);
    showToast?.('Logged out. Continuing as Guest.');
  }, [showToast]);

  const requireLogin = useCallback((action) => {
    if (isAuthenticated) return true;

    openLogin();
    showToast?.(`Please login to ${action}.`);
    return false;
  }, [isAuthenticated, openLogin, showToast]);

  const expireSession = useCallback(() => {
    setAuth(null);
    openLogin();
    showToast?.('Session expired. Please login again.');
  }, [openLogin, showToast]);

  return {
    auth,
    isAuthenticated,
    isLoggingIn,
    isLoginModalOpen,
    loginError,
    setIsLoginModalOpen,
    setLoginError,
    openLogin,
    handleLogin,
    handleLogout,
    requireLogin,
    expireSession,
  };
}

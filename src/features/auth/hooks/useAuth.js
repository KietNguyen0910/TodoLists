import { useState } from 'react';
import { login as loginRequest } from '../../../api/authApi';
import { clearStoredAuth, getStoredAuth } from '../utils/authStorage';

export function useAuth({ showToast } = {}) {
  const [auth, setAuth] = useState(getStoredAuth);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const isAuthenticated = Boolean(auth?.token);

  const openLogin = () => {
    setLoginError('');
    setIsLoginModalOpen(true);
  };

  const handleLogin = async (username, password) => {
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
  };

  const handleLogout = () => {
    clearStoredAuth();
    setAuth(null);
    showToast?.('Logged out. Continuing as Guest.');
  };

  const requireLogin = (action) => {
    if (isAuthenticated) return true;

    openLogin();
    showToast?.(`Please login to ${action}.`);
    return false;
  };

  const expireSession = () => {
    setAuth(null);
    openLogin();
    showToast?.('Session expired. Please login again.');
  };

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

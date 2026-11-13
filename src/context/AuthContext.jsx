import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session via HTTP-only cookie on mount
  const checkSession = useCallback(async () => {
    try {
      const data = await authService.getMe();
      if (data && data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Login action
  const login = async (email, password, remember_me) => {
    const data = await authService.login({ email, password, remember_me });
    if (data && data.success && data.user) {
      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('slate_auth_token', data.token);
      }
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || 'Login failed');
  };

  // Register action
  const register = async (userData) => {
    const data = await authService.register(userData);
    if (data && data.success && data.user) {
      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('slate_auth_token', data.token);
      }
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || 'Registration failed');
  };

  // Logout action
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('slate_auth_token');
      }
      setUser(null);
    }
  };

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


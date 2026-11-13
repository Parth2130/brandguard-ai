import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('brandguard_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [organization, setOrganization] = useState(() => {
    try {
      const saved = localStorage.getItem('brandguard_org');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('brandguard_token') || '');
  const [loading, setLoading] = useState(true);

  // Verify session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('brandguard_token');
      if (savedToken) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data.user);
          setOrganization(res.data.organization);
          localStorage.setItem('brandguard_user', JSON.stringify(res.data.user));
          if (res.data.organization) {
            localStorage.setItem('brandguard_org', JSON.stringify(res.data.organization));
          }
        } catch (err) {
          console.error("Session verification failed", err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user, organization } = res.data;
    setToken(token);
    setUser(user);
    setOrganization(organization);
    localStorage.setItem('brandguard_token', token);
    localStorage.setItem('brandguard_user', JSON.stringify(user));
    if (organization) {
      localStorage.setItem('brandguard_org', JSON.stringify(organization));
    }
    return res.data;
  };

  const register = async (userData) => {
    const res = await authAPI.register(userData);
    const { token, user, organization } = res.data;
    setToken(token);
    setUser(user);
    setOrganization(organization);
    localStorage.setItem('brandguard_token', token);
    localStorage.setItem('brandguard_user', JSON.stringify(user));
    if (organization) {
      localStorage.setItem('brandguard_org', JSON.stringify(organization));
    }
    return res.data;
  };

  const logout = () => {
    setUser(null);
    setOrganization(null);
    setToken('');
    localStorage.removeItem('brandguard_token');
    localStorage.removeItem('brandguard_user');
    localStorage.removeItem('brandguard_org');
  };

  // Helper to switch demo personas seamlessly
  const switchDemoAccount = async (roleName) => {
    const demoAccounts = {
      ADMIN: 'admin@technova.com',
      CONTENT_CREATOR: 'creator@technova.com',
      BRAND_REVIEWER: 'reviewer@technova.com',
      MARKETING_MANAGER: 'manager@technova.com'
    };
    const targetEmail = demoAccounts[roleName] || 'admin@technova.com';
    return await login(targetEmail, 'password123');
  };

  const value = {
    user,
    organization,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    role: user?.role || '',
    isAdmin: user?.role === 'ADMIN',
    isReviewer: user?.role === 'BRAND_REVIEWER' || user?.role === 'ADMIN',
    isCreator: user?.role === 'CONTENT_CREATOR' || user?.role === 'ADMIN',
    isManager: user?.role === 'MARKETING_MANAGER' || user?.role === 'ADMIN',
    login,
    register,
    logout,
    switchDemoAccount
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

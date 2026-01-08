import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, AuthResponse } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  nomeCompleto: string;
  cpf: string;
  crm: string;
  crmLocal: string;
  dataNascimento: string;
  especialidade?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to safely parse JSON from localStorage
const safeParseJSON = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state immediately from localStorage (no loading delay)
  const [user, setUser] = useState<User | null>(() => {
    return safeParseJSON<User | null>(localStorage.getItem('user'), null);
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });
  const [isLoading, setIsLoading] = useState(false);

  // Track if we've already refreshed to avoid double refresh
  const hasRefreshed = useRef(false);

  // Refresh user in background (non-blocking)
  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      // Only logout if it's an auth error, not a network error
      const err = error as any;
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        logout();
      }
      // For network errors, keep the cached user data
    }
  }, []);

  // On mount, refresh user data in background if we have a token
  useEffect(() => {
    if (token && !hasRefreshed.current) {
      hasRefreshed.current = true;
      // Refresh in background without setting loading state
      refreshUser();
    }
  }, [token, refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      const data: AuthResponse = response.data;

      localStorage.setItem('token', data.token);
      setToken(data.token);

      // Fetch full user data
      const userResponse = await authService.getMe();
      setUser(userResponse.data);
      localStorage.setItem('user', JSON.stringify(userResponse.data));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      const authData: AuthResponse = response.data;

      localStorage.setItem('token', authData.token);
      setToken(authData.token);

      // Fetch full user data
      const userResponse = await authService.getMe();
      setUser(userResponse.data);
      localStorage.setItem('user', JSON.stringify(userResponse.data));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    hasRefreshed.current = false;
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.cargo === 'Administrador',
    login,
    register,
    logout,
    updateUser,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

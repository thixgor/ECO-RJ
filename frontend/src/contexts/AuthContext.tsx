import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      refreshUser();
    }
    setIsLoading(false);
  }, []);

  const refreshUser = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const data: AuthResponse = response.data;

    localStorage.setItem('token', data.token);
    setToken(data.token);

    // Fetch full user data
    const userResponse = await authService.getMe();
    setUser(userResponse.data);
    localStorage.setItem('user', JSON.stringify(userResponse.data));
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    const authData: AuthResponse = response.data;

    localStorage.setItem('token', authData.token);
    setToken(authData.token);

    // Fetch full user data
    const userResponse = await authService.getMe();
    setUser(userResponse.data);
    localStorage.setItem('user', JSON.stringify(userResponse.data));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

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

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingPage } from './Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAluno?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireAluno = false
}) => {
  const { isAuthenticated, isAdmin, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAluno) {
    const allowedRoles = ['Aluno', 'Instrutor', 'Administrador'];
    if (!allowedRoles.includes(user?.cargo || '')) {
      return <Navigate to="/perfil" state={{ message: 'Aplique uma serial key para acessar este conteúdo' }} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

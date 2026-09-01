import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasContentAccess } from '../../config/roles';
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

  // Quem foi matriculado em algum curso passa, mesmo que o cargo global ainda
  // seja "Visitante" — o acesso a cada conteúdo é conferido no backend.
  if (requireAluno) {
    if (!hasContentAccess(user)) {
      return <Navigate to="/perfil" state={{ message: 'Este conteúdo é para Alunos. Compre um curso ou ative sua chave de acesso.' }} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

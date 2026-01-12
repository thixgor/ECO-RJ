import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  User,
  Settings,
  Users,
  Key,
  BarChart3,
  FileText,
  Activity,
  ClipboardList,
  X,
  Shield,
  Bell,
  Award
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeSwitch } from '../ui';

// Logos ECO RJ
const LOGO_DARK = 'https://i.imgur.com/qBXnSUD.png';
const LOGO_LIGHT = 'https://i.imgur.com/B1SnAtD.png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isVisible?: boolean;
  onToggleVisible?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isVisible = true }) => {
  const { isAdmin, user } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();

  // Alunos, Instrutores e Admins podem ver a seção de exercícios
  const canAccessExercises = user?.cargo && ['Aluno', 'Instrutor', 'Administrador'].includes(user.cargo);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  }, [location.pathname]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link-glass ${isActive ? 'active' : ''}`;

  return (
    <>
      {/* Overlay for mobile - Higher z-index and better touch handling */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
          onTouchEnd={(e) => {
            e.preventDefault();
            onClose();
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky inset-y-0 lg:top-0 lg:h-screen left-0 z-50
          glass-sidebar
          transform transition-all duration-300 ease-out
          lg:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isVisible ? 'w-[85vw] sm:w-80 lg:w-72 opacity-100' : 'lg:w-0 lg:opacity-0 lg:pointer-events-none lg:overflow-hidden'}
          safe-area-top safe-area-left
        `}
      >
        <div className={`flex flex-col h-full transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'lg:opacity-0'}`}>
          {/* Header - Mobile */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--glass-border)] lg:hidden">
            <div className="flex items-center gap-3">
              <img
                src={isDark ? LOGO_DARK : LOGO_LIGHT}
                alt="ECO RJ"
                className="h-8 w-auto select-none pointer-events-none"
                loading="lazy"
                decoding="async"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
              <span className="font-heading font-bold text-lg text-gradient">ECO RJ</span>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-all duration-200 touch-target"
              aria-label="Fechar menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Logo - Desktop */}
          <div className="hidden lg:flex items-center gap-3 p-6 border-b border-[var(--glass-border)]">
            <img
              src={isDark ? LOGO_DARK : LOGO_LIGHT}
              alt="ECO RJ"
              className="h-10 w-auto drop-shadow-lg select-none pointer-events-none"
              loading="lazy"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
            <div>
              <h2 className="font-heading font-bold text-gradient">ECO RJ</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Centro de Treinamento em Ecocardiografia</p>
            </div>
          </div>

          {/* User info - Mobile only */}
          {user && (
            <div className="lg:hidden p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center overflow-hidden">
                  {user.fotoPerfil ? (
                    <img src={user.fotoPerfil} alt="" className="w-12 h-12 object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <User className="w-6 h-6 text-primary-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-text-primary)] truncate">
                    {user.nomeCompleto}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                    {user.cargo}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto scroll-container-y">
            {/* Main Section */}
            <div className="mb-4">
              <p className="px-4 mb-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Principal
              </p>

              <NavLink to="/dashboard" className={navLinkClass} onClick={onClose}>
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/cursos" className={navLinkClass} onClick={onClose}>
                <BookOpen className="w-5 h-5 flex-shrink-0" />
                <span>Cursos</span>
              </NavLink>

              {canAccessExercises && (
                <NavLink to="/exercicios" className={navLinkClass} onClick={onClose}>
                  <ClipboardList className="w-5 h-5 flex-shrink-0" />
                  <span>Exercícios</span>
                </NavLink>
              )}

              <NavLink to="/forum" className={navLinkClass} onClick={onClose}>
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                <span>Fórum</span>
              </NavLink>
            </div>

            {/* Account Section */}
            <div className="mb-4">
              <p className="px-4 mb-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Conta
              </p>

              <NavLink to="/perfil" className={navLinkClass} onClick={onClose}>
                <User className="w-5 h-5 flex-shrink-0" />
                <span>Meu Perfil</span>
              </NavLink>
            </div>

            {/* Admin Section */}
            {isAdmin && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-4 mb-2">
                  <Shield className="w-3.5 h-3.5 text-primary-500" />
                  <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
                    Administração
                  </p>
                </div>

                <NavLink to="/admin" end className={navLinkClass} onClick={onClose}>
                  <BarChart3 className="w-5 h-5 flex-shrink-0" />
                  <span>Estatísticas</span>
                </NavLink>

                <NavLink to="/admin/usuarios" className={navLinkClass} onClick={onClose}>
                  <Users className="w-5 h-5 flex-shrink-0" />
                  <span>Usuários</span>
                </NavLink>

                <NavLink to="/admin/cursos" className={navLinkClass} onClick={onClose}>
                  <BookOpen className="w-5 h-5 flex-shrink-0" />
                  <span>Gerenciar Cursos</span>
                </NavLink>

                <NavLink to="/admin/aulas" className={navLinkClass} onClick={onClose}>
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <span>Gerenciar Aulas</span>
                </NavLink>

                <NavLink to="/admin/exercicios" className={navLinkClass} onClick={onClose}>
                  <ClipboardList className="w-5 h-5 flex-shrink-0" />
                  <span>Gerenciar Exercícios</span>
                </NavLink>

                <NavLink to="/admin/serial-keys" className={navLinkClass} onClick={onClose}>
                  <Key className="w-5 h-5 flex-shrink-0" />
                  <span>Serial Keys</span>
                </NavLink>

                <NavLink to="/admin/avisos" className={navLinkClass} onClick={onClose}>
                  <Bell className="w-5 h-5 flex-shrink-0" />
                  <span>Avisos</span>
                </NavLink>

                <NavLink to="/admin/certificados" className={navLinkClass} onClick={onClose}>
                  <Award className="w-5 h-5 flex-shrink-0" />
                  <span>Certificados</span>
                </NavLink>

                <NavLink to="/admin/logs" className={navLinkClass} onClick={onClose}>
                  <Activity className="w-5 h-5 flex-shrink-0" />
                  <span>Logs de Acesso</span>
                </NavLink>

                <NavLink to="/admin/configuracoes" className={navLinkClass} onClick={onClose}>
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span>Configurações</span>
                </NavLink>
              </div>
            )}
          </nav>

          {/* Footer with Theme Switch */}
          <div className="p-4 border-t border-[var(--glass-border)] safe-area-bottom">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm text-[var(--color-text-muted)]">Tema</span>
              <ThemeSwitch />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

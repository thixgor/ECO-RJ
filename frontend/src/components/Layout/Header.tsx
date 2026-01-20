import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown, Shield, Smartphone, BookOpen, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { ThemeSwitch, GlassBadge } from '../ui';

// Logos ECO RJ
const LOGO_DARK = 'https://i.imgur.com/qBXnSUD.png';
const LOGO_LIGHT = 'https://i.imgur.com/B1SnAtD.png';

const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isDark } = useTheme();
  const { profileType } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar se pode acessar App (apenas médicos, não pacientes)
  const isPatientMode = profileType === 'patient';
  const canAccessApp = isAuthenticated && user?.cargo && ['Aluno', 'Instrutor', 'Administrador'].includes(user.cargo) && !isPatientMode;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsDropdownOpen(false);
  };

  return (
    <header
      className={`
        sticky top-0 z-50
        transition-all duration-500 ease-apple
        ${isScrolled
          ? 'glass-card-static !rounded-none border-x-0 border-t-0'
          : 'bg-transparent'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 relative">
          {/* Logo - Left */}
          <Link to="/" className="flex items-center gap-3 group z-10">
            <img
              src={isDark ? LOGO_DARK : LOGO_LIGHT}
              alt="ECO RJ"
              className="h-10 w-auto drop-shadow-lg group-hover:scale-110 transition-transform duration-300 select-none pointer-events-none"
              loading="lazy"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
            <span className="font-heading font-bold text-xl text-gradient">ECO RJ</span>
          </Link>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden md:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
            <NavLink
              to="/cursos"
              icon={<BookOpen className="w-4 h-4" />}
              isActive={location.pathname === '/cursos' || location.pathname.startsWith('/cursos/')}
            >
              Cursos
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink
                  to="/dashboard"
                  icon={<LayoutDashboard className="w-4 h-4" />}
                  isActive={location.pathname === '/dashboard'}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/forum"
                  icon={<MessageSquare className="w-4 h-4" />}
                  isActive={location.pathname === '/forum' || location.pathname.startsWith('/forum/')}
                >
                  Fórum
                </NavLink>
                {canAccessApp && (
                  <NavLink
                    to="/app"
                    icon={<Smartphone className="w-4 h-4" />}
                    isActive={location.pathname === '/app'}
                  >
                    App
                  </NavLink>
                )}
              </>
            )}
          </nav>

          {/* Desktop Auth - Right */}
          <div className="hidden md:flex items-center gap-4 ml-auto z-10">
            <ThemeSwitch />

            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl glass-card-static hover:bg-[var(--glass-bg-hover)] transition-all duration-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center overflow-hidden">
                    {user?.fotoPerfil ? (
                      <img src={user.fotoPerfil} alt="" className="w-8 h-8 object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <User className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {user?.nomeCompleto ? (
                      ['Prof.', 'Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(user.nomeCompleto.split(' ')[0])
                        ? user.nomeCompleto.split(' ').slice(0, 2).join(' ')
                        : user.nomeCompleto.split(' ')[0]
                    ) : ''}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass-card-static animate-scale-in overflow-hidden">
                    <div className="p-4 border-b border-[var(--glass-border)]">
                      <p className="font-semibold text-[var(--color-text-primary)]">{user?.nomeCompleto}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <GlassBadge variant="primary" size="sm">
                          {user?.cargo}
                        </GlassBadge>
                      </div>
                    </div>
                    <div className="py-2">
                      <Link
                        to="/perfil"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-all duration-200"
                      >
                        <User className="w-4 h-4" />
                        Meu Perfil
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-all duration-200"
                        >
                          <Shield className="w-4 h-4" />
                          Painel Admin
                        </Link>
                      )}
                      <div className="border-t border-[var(--glass-border)] my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all duration-200"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="nav-link-glass !py-2"
                >
                  Entrar
                </Link>
                <Link
                  to="/registro"
                  className="glass-btn-primary !py-2"
                >
                  Criar Conta
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-all duration-200"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--glass-border)] animate-slide-down">
            <nav className="flex flex-col gap-1">
              <Link
                to="/cursos"
                onClick={() => setIsMenuOpen(false)}
                className="nav-link-glass"
              >
                Cursos
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="nav-link-glass"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/forum"
                    onClick={() => setIsMenuOpen(false)}
                    className="nav-link-glass"
                  >
                    Fórum
                  </Link>
                  {canAccessApp && (
                    <Link
                      to="/app"
                      onClick={() => setIsMenuOpen(false)}
                      className="nav-link-glass"
                    >
                      <Smartphone className="w-5 h-5" />
                      App
                    </Link>
                  )}
                  <Link
                    to="/perfil"
                    onClick={() => setIsMenuOpen(false)}
                    className="nav-link-glass"
                  >
                    <User className="w-5 h-5" />
                    Meu Perfil
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="nav-link-glass"
                    >
                      <Shield className="w-5 h-5" />
                      Painel Admin
                    </Link>
                  )}
                  <div className="border-t border-[var(--glass-border)] my-2" />
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-[var(--color-text-muted)]">Tema</span>
                    <ThemeSwitch />
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-left text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-[var(--glass-border)] my-2" />
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-[var(--color-text-muted)]">Tema</span>
                    <ThemeSwitch />
                  </div>
                  <div className="border-t border-[var(--glass-border)] my-2" />
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="nav-link-glass"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/registro"
                    onClick={() => setIsMenuOpen(false)}
                    className="glass-btn-primary mx-4 text-center"
                  >
                    Criar Conta
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

// NavLink component for desktop navigation with improved design
interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isActive?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children, icon, isActive }) => {
  return (
    <Link
      to={to}
      className={`
        relative flex items-center gap-2 px-4 py-2 rounded-xl
        font-medium text-sm
        transition-all duration-300 ease-apple
        group
        ${isActive
          ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400 shadow-sm'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)]'
        }
      `}
    >
      {icon && (
        <span className={`
          transition-all duration-300
          ${isActive
            ? 'text-primary-500'
            : 'text-[var(--color-text-muted)] group-hover:text-primary-500'
          }
        `}>
          {icon}
        </span>
      )}
      <span>{children}</span>
      {isActive && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary-500 rounded-full" />
      )}
    </Link>
  );
};

export default Header;

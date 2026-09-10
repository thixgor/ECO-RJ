import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { ThemeSwitch, GlassBadge } from '../ui';

// Logos ECO RJ
const LOGO_DARK = 'https://i.imgur.com/qBXnSUD.png';
const LOGO_LIGHT = 'https://i.imgur.com/B1SnAtD.png';

/**
 * Cabeçalho — arquétipo N6 "newspaper masthead", variante alinhada à esquerda.
 *
 * Três faixas empilhadas, como o cabeçalho de um jornal:
 *   1. linha institucional (mono, caixa alta) + tema + sessão
 *   2. logotipo + navegação
 *   3. régua dupla que fecha o bloco
 *
 * Sem vidro, sem desfoque, sem gradiente no logotipo. A hierarquia vem da
 * régua e do contraste de tipo. Ver design.md § Macrostructure family.
 */
const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isDark } = useTheme();
  const { profileType } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const isPatientMode = profileType === 'patient';
  const canAccessApp =
    isAuthenticated &&
    user?.cargo &&
    ['Aluno', 'Instrutor', 'Administrador'].includes(user.cargo) &&
    !isPatientMode;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Esc fecha o menu de conta — teclado precisa de saída.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsDropdownOpen(false);
  };

  const primaryNav = [
    { to: '/cursos', label: 'Cursos', match: (p: string) => p.startsWith('/cursos'), always: true },
    { to: '/materiais', label: 'Materiais', match: (p: string) => p.startsWith('/materiais'), always: true },
    { to: '/dashboard', label: 'Painel', match: (p: string) => p === '/dashboard', always: false },
    { to: '/forum', label: 'Fórum', match: (p: string) => p.startsWith('/forum'), always: false },
  ].filter((item) => item.always || isAuthenticated);

  const firstName = user?.nomeCompleto
    ? ['Prof.', 'Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(user.nomeCompleto.split(' ')[0])
      ? user.nomeCompleto.split(' ').slice(0, 2).join(' ')
      : user.nomeCompleto.split(' ')[0]
    : '';

  return (
    <header className="sticky top-0 z-sticky bg-[var(--color-paper)]">
      {/* Faixa 1 — linha institucional. É onde o nome completo vive. */}
      <div className="border-b border-[var(--color-rule)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-4 h-9">
            <p className="label-caps truncate">
              <span className="hidden sm:inline">Centro de Treinamento em Ecocardiografia</span>
              <span className="sm:hidden">Ecocardiografia</span>
              <span className="hidden lg:inline"> · Rio de Janeiro</span>
            </p>

            <div className="flex items-center gap-4 flex-shrink-0">
              <ThemeSwitch />

              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="hidden md:inline label-caps hover:text-[var(--color-accent)] transition-colors duration-micro ease-out"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Faixa 2 — logotipo e navegação. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-6 h-16">
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <img
              src={isDark ? LOGO_DARK : LOGO_LIGHT}
              alt=""
              className="h-9 w-auto select-none pointer-events-none"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
            <span className="font-heading text-xl font-semibold tracking-display text-[var(--color-ink-deep)]">
              ECO&nbsp;RJ
            </span>
          </Link>

          {/* Navegação: links tipográficos com sublinhado de régua no ativo. */}
          <nav className="hidden md:flex items-center gap-7 ml-auto" aria-label="Principal">
            {primaryNav.map((item) => {
              const active = item.match(location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    relative whitespace-nowrap text-sm py-1
                    transition-colors duration-micro ease-out
                    ${active
                      ? 'text-[var(--color-accent)] font-medium'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}
                  `}
                >
                  {item.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-[var(--color-accent)]"
                    />
                  )}
                </Link>
              );
            })}
            {canAccessApp && (
              <Link
                to="/app"
                className="whitespace-nowrap text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors duration-micro ease-out"
              >
                App
              </Link>
            )}
          </nav>

          {/* Sessão */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm border border-[var(--color-rule)] hover:border-[var(--color-rule-strong)] transition-colors duration-micro ease-out"
                >
                  <span className="w-6 h-6 rounded-xs bg-[var(--color-paper-3)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user?.fotoPerfil ? (
                      <img src={user.fotoPerfil} alt="" className="w-6 h-6 object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-[var(--color-neutral)]" aria-hidden="true" />
                    )}
                  </span>
                  <span className="text-sm text-[var(--color-ink)] whitespace-nowrap">{firstName}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-3.5 h-3.5 text-[var(--color-neutral)] transition-transform duration-short ease-out ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1 w-60 bg-[var(--color-paper)] border border-[var(--color-rule-strong)] rounded-sm shadow-raised animate-scale-in overflow-hidden"
                  >
                    <div className="p-4 border-b border-[var(--color-rule)]">
                      <p className="text-sm font-medium text-[var(--color-ink)] truncate">{user?.nomeCompleto}</p>
                      <p className="text-xs text-[var(--color-neutral)] truncate mt-0.5">{user?.email}</p>
                      <span className="inline-block mt-2">
                        <GlassBadge variant="primary" size="sm">{user?.cargo}</GlassBadge>
                      </span>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/perfil"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-colors duration-micro ease-out"
                      >
                        <User className="w-4 h-4" aria-hidden="true" />
                        Meu perfil
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          role="menuitem"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-colors duration-micro ease-out"
                        >
                          <Shield className="w-4 h-4" aria-hidden="true" />
                          Administração
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors duration-micro ease-out border-t border-[var(--color-rule)] mt-1"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/registro" className="glass-btn-primary !px-4 !py-2 !text-xs">
                Criar conta
              </Link>
            )}
          </div>

          {/* Botão de menu — celular */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="md:hidden p-2.5 -mr-2 text-[var(--color-ink)] touch-target"
          >
            {isMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Faixa 3 — régua dupla fecha o masthead. */}
      <hr className="rule-double" aria-hidden="true" />

      {/* Menu — celular */}
      {isMenuOpen && (
        <div className="md:hidden border-b border-[var(--color-rule)] bg-[var(--color-paper)] animate-slide-down">
          <nav className="max-w-7xl mx-auto px-2 py-2" aria-label="Principal">
            {primaryNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsMenuOpen(false)}
                aria-current={item.match(location.pathname) ? 'page' : undefined}
                className={`nav-link-glass ${item.match(location.pathname) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}

            {canAccessApp && (
              <Link to="/app" onClick={() => setIsMenuOpen(false)} className="nav-link-glass">
                <Smartphone className="w-4 h-4" aria-hidden="true" />
                App
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <Link to="/perfil" onClick={() => setIsMenuOpen(false)} className="nav-link-glass">
                  <User className="w-4 h-4" aria-hidden="true" />
                  Meu perfil
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="nav-link-glass">
                    <Shield className="w-4 h-4" aria-hidden="true" />
                    Administração
                  </Link>
                )}
                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="nav-link-glass w-full !text-[var(--color-danger)] border-t border-[var(--color-rule)] mt-1"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sair
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--color-rule)] mt-1">
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="glass-btn !flex-1 !px-3 !text-xs">
                  Entrar
                </Link>
                <Link to="/registro" onClick={() => setIsMenuOpen(false)} className="glass-btn-primary !flex-1 !px-3 !text-xs">
                  Criar conta
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;

import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasContentAccess } from '../../config/roles';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import ErrorBoundary from '../common/ErrorBoundary';

// Layout público (sem sidebar)
export const PublicLayout: React.FC = () => {
  // Scroll automático para o topo ao navegar
  useScrollToTop();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-8 sm:pb-0">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

// Layout autenticado (com sidebar)
export const AuthenticatedLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    const saved = localStorage.getItem('eco-rj-sidebar-visible');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const { user } = useAuth();

  // Quem já tem curso vinculado não é tratado como visitante, mesmo que o cargo
  // global ainda seja "Visitante" (ex.: matriculado pelo admin).
  const semAcessoAoConteudo = !hasContentAccess(user);

  // Scroll automático para o topo ao navegar
  useScrollToTop();

  useEffect(() => {
    localStorage.setItem('eco-rj-sidebar-visible', JSON.stringify(isSidebarVisible));
  }, [isSidebarVisible]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      // Fix for Safari iOS: save overflow state
      document.body.setAttribute('data-sidebar-overflow', document.body.style.overflow || '');
    } else {
      // Restore overflow or use empty string
      const originalOverflow = document.body.getAttribute('data-sidebar-overflow');
      document.body.style.overflow = originalOverflow || '';
      document.body.removeAttribute('data-sidebar-overflow');
    }
    return () => {
      // Cleanup: always restore overflow
      const originalOverflow = document.body.getAttribute('data-sidebar-overflow');
      document.body.style.overflow = originalOverflow || '';
      document.body.removeAttribute('data-sidebar-overflow');
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isVisible={isSidebarVisible}
          onToggleVisible={() => setIsSidebarVisible(!isSidebarVisible)}
        />
        <div className="flex-1 flex flex-col relative overflow-y-auto scroll-container-y">
          {/* Sidebar toggle button (Floating Glass) - Desktop only */}
          <button
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            className={`
              hidden lg:flex fixed top-4 z-raised items-center justify-center
              w-8 h-12
              bg-[var(--color-paper)] border border-l-0 border-[var(--color-rule)]
              text-[var(--color-neutral)] hover:text-[var(--color-accent)]
              transition-[left,color] duration-short ease-out
              ${isSidebarVisible ? 'left-72' : 'left-0'}
            `}
            style={{ marginTop: '64px' }}
            title={isSidebarVisible ? "Ocultar Menu" : "Mostrar Menu"}
          >
            {isSidebarVisible ? (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* Mobile menu button - Better touch target */}
          <div className="lg:hidden sticky top-0 z-raised border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors duration-micro ease-out touch-target-lg"
            >
              <Menu className="w-4 h-4" aria-hidden="true" />
              <span className="label-caps">Menu</span>
            </button>
          </div>

          {/* Cabeçalho da área do aluno.
              Antes: cartão de vidro com dois blobs desfocados e um ponto verde
              pulsando. Agora: régua, saudação em display e o estado da conta
              dito por escrito — o estado é informação, não animação. */}
          <div className="px-4 sm:px-6 lg:pl-14 pt-6 pb-5 border-b border-[var(--color-rule)]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="label-caps">
                  {semAcessoAoConteudo ? 'Acesso pendente' : `Sessão · ${user?.cargo}`}
                </p>
                <h1 className="font-heading text-2xl sm:text-3xl font-medium tracking-display text-[var(--color-ink-deep)] mt-1">
                  {user?.nomeCompleto ? (
                    ['Prof.', 'Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(user.nomeCompleto.split(' ')[0])
                      ? user.nomeCompleto.split(' ').slice(0, 2).join(' ')
                      : user.nomeCompleto.split(' ')[0]
                  ) : 'Bem-vindo'}
                </h1>
                {semAcessoAoConteudo && (
                  <p className="text-sm text-[var(--color-muted)] mt-1.5 max-w-md">
                    Sua conta ainda não tem acesso ao conteúdo. Ative uma serial key no perfil para liberar aulas, exercícios e fórum.
                  </p>
                )}
              </div>

              {semAcessoAoConteudo && (
                <Link to="/perfil" className="glass-btn-primary !py-2.5 !px-4 !text-xs flex-shrink-0">
                  Ativar serial key
                </Link>
              )}
            </div>
          </div>

          {/* Main content - Responsive padding */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 safe-area-bottom">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

// Layout admin
export const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    const saved = localStorage.getItem('eco-rj-sidebar-visible');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Scroll automático para o topo ao navegar
  useScrollToTop();

  useEffect(() => {
    localStorage.setItem('eco-rj-sidebar-visible', JSON.stringify(isSidebarVisible));
  }, [isSidebarVisible]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      // Fix for Safari iOS: save overflow state
      document.body.setAttribute('data-sidebar-overflow', document.body.style.overflow || '');
    } else {
      // Restore overflow or use empty string
      const originalOverflow = document.body.getAttribute('data-sidebar-overflow');
      document.body.style.overflow = originalOverflow || '';
      document.body.removeAttribute('data-sidebar-overflow');
    }
    return () => {
      // Cleanup: always restore overflow
      const originalOverflow = document.body.getAttribute('data-sidebar-overflow');
      document.body.style.overflow = originalOverflow || '';
      document.body.removeAttribute('data-sidebar-overflow');
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isVisible={isSidebarVisible}
          onToggleVisible={() => setIsSidebarVisible(!isSidebarVisible)}
        />
        <div className="flex-1 flex flex-col relative overflow-y-auto scroll-container-y">
          {/* Sidebar toggle button (Floating Glass) - Desktop only */}
          <button
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            className={`
              hidden lg:flex fixed top-4 z-raised items-center justify-center
              w-8 h-12
              bg-[var(--color-paper)] border border-l-0 border-[var(--color-rule)]
              text-[var(--color-neutral)] hover:text-[var(--color-accent)]
              transition-[left,color] duration-short ease-out
              ${isSidebarVisible ? 'left-72' : 'left-0'}
            `}
            style={{ marginTop: '64px' }}
            title={isSidebarVisible ? "Ocultar Menu" : "Mostrar Menu"}
          >
            {isSidebarVisible ? (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* Mobile menu button - Better touch target */}
          <div className="lg:hidden sticky top-0 z-raised border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors duration-micro ease-out touch-target-lg"
            >
              <Menu className="w-4 h-4" aria-hidden="true" />
              <span className="label-caps">Menu</span>
            </button>
          </div>

          {/* Main content - Responsive padding */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 safe-area-bottom">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};

// Layout para páginas públicas que devem mostrar sidebar se logado
export const PublicPageWrapper: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AuthenticatedLayout /> : <PublicLayout />;
};

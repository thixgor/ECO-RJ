import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import ErrorBoundary from '../common/ErrorBoundary';

// Layout público (sem sidebar)
export const PublicLayout: React.FC = () => {
  // Scroll automático para o topo ao navegar
  useScrollToTop();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
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
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
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
              hidden lg:flex fixed top-4 z-40 items-center justify-center
              w-10 h-10 rounded-r-xl glass-card-static
              border-l-0 border-[var(--glass-border)]
              text-[var(--color-text-muted)] hover:text-primary-500
              transition-all duration-500 ease-apple touch-target
              ${isSidebarVisible ? 'left-72' : 'left-0'}
            `}
            style={{ marginTop: '64px' }}
            title={isSidebarVisible ? "Ocultar Menu" : "Mostrar Menu"}
          >
            {isSidebarVisible ? (
              <ChevronLeft className="w-5 h-5 transition-transform duration-500" />
            ) : (
              <ChevronRight className="w-5 h-5 transition-transform duration-500" />
            )}
          </button>

          {/* Mobile menu button - Better touch target */}
          <div className="lg:hidden sticky top-0 z-30 p-3 sm:p-4 border-b border-[var(--glass-border)] glass-card-static !rounded-none">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-all touch-target-lg w-full sm:w-auto"
            >
              <Menu className="w-5 h-5" />
              <span className="font-medium">Menu</span>
            </button>
          </div>

          {/* Welcome bar - Redesigned & Fixed collision */}
          <div className={`
            px-4 sm:px-6 py-4 sm:py-6 
            transition-all duration-500 ease-apple
            ${isSidebarVisible ? 'lg:pl-14' : 'lg:pl-14'} 
          `}>
            <div className="glass-card-static p-4 sm:p-6 border-none shadow-lg overflow-hidden relative">
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-400/5 rounded-full blur-2xl -ml-12 -mb-12" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-heading text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                    <span className="text-primary-500">Olá,</span> {user?.nomeCompleto ? (
                      ['Prof.', 'Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(user.nomeCompleto.split(' ')[0])
                        ? user.nomeCompleto.split(' ').slice(0, 2).join(' ')
                        : user.nomeCompleto.split(' ')[0]
                    ) : ''}!
                  </h1>
                  <p className="text-[var(--color-text-secondary)] text-sm mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {user?.cargo === 'Visitante'
                      ? 'Inicie sua jornada na Ecocardiografia hoje'
                      : `Conectado como ${user?.cargo}`}
                  </p>
                </div>

                {user?.cargo === 'Visitante' && (
                  <Link
                    to="/perfil"
                    className="glass-btn-primary !py-2 !px-4 text-sm"
                  >
                    Ativar Serial Key
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Main content - Responsive padding */}
          <main className="flex-1 p-4 sm:p-6 bg-background dark:bg-dark-bg/50 safe-area-bottom">
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
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
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
              hidden lg:flex fixed top-4 z-40 items-center justify-center
              w-10 h-10 rounded-r-xl glass-card-static
              border-l-0 border-[var(--glass-border)]
              text-[var(--color-text-muted)] hover:text-primary-500
              transition-all duration-500 ease-apple touch-target
              ${isSidebarVisible ? 'left-72' : 'left-0'}
            `}
            style={{ marginTop: '64px' }}
            title={isSidebarVisible ? "Ocultar Menu" : "Mostrar Menu"}
          >
            {isSidebarVisible ? (
              <ChevronLeft className="w-5 h-5 transition-transform duration-500" />
            ) : (
              <ChevronRight className="w-5 h-5 transition-transform duration-500" />
            )}
          </button>

          {/* Mobile menu button - Better touch target */}
          <div className="lg:hidden sticky top-0 z-30 p-3 sm:p-4 border-b border-[var(--glass-border)] glass-card-static !rounded-none">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-all touch-target-lg w-full sm:w-auto"
            >
              <Menu className="w-5 h-5" />
              <span className="font-medium">Menu</span>
            </button>
          </div>

          {/* Main content - Responsive padding */}
          <main className="flex-1 p-4 sm:p-6 bg-background dark:bg-dark-bg/50 safe-area-bottom">
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

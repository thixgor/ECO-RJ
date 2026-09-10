import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { PublicLayout, AuthenticatedLayout, AdminLayout, PublicPageWrapper } from './components/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import { LoadingMinimal } from './components/common/Loading';
import WelcomeModal from './components/common/WelcomeModal';
import LandingPageWrapper from './components/common/LandingPageWrapper';

// Lazy load pages for better performance
// Public Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Checkout = lazy(() => import('./pages/Checkout'));
const PaymentStatus = lazy(() => import('./pages/PaymentStatus'));
const Ativar = lazy(() => import('./pages/Ativar'));
const Materiais = lazy(() => import('./pages/Materiais'));
const MaterialDetail = lazy(() => import('./pages/MaterialDetail'));
const MaterialCheckout = lazy(() => import('./pages/MaterialCheckout'));
const MaterialPaymentStatus = lazy(() => import('./pages/MaterialPaymentStatus'));
const MaterialAccess = lazy(() => import('./pages/MaterialAccess'));

// Authenticated Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Profile = lazy(() => import('./pages/Profile'));
const Forum = lazy(() => import('./pages/Forum'));
const ForumTopic = lazy(() => import('./pages/ForumTopic'));
const Exercises = lazy(() => import('./pages/Exercises'));
const AppDownload = lazy(() => import('./pages/AppDownload'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const AdminLessons = lazy(() => import('./pages/admin/AdminLessons'));
const AdminSerialKeys = lazy(() => import('./pages/admin/AdminSerialKeys'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminMaterials = lazy(() => import('./pages/admin/AdminMaterials'));
const AdminAccessLogs = lazy(() => import('./pages/admin/AdminAccessLogs'));
const AdminExercises = lazy(() => import('./pages/admin/AdminExercises'));
const AdminSiteConfig = lazy(() => import('./pages/admin/AdminSiteConfig'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminCertificates = lazy(() => import('./pages/admin/AdminCertificates'));
const AdminCertificateRequests = lazy(() => import('./pages/admin/AdminCertificateRequests'));
const ValidateCertificate = lazy(() => import('./pages/ValidateCertificate'));

const App: React.FC = () => {
  // Remove splash screen when App mounts
  React.useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 300);
    }
  }, []);

  // Fix for Safari iOS: Clean up any stuck overflow state from previous sessions
  React.useEffect(() => {
    // Remove any data attributes from modals/sidebars
    document.body.removeAttribute('data-original-overflow');
    document.body.removeAttribute('data-sidebar-overflow');

    // Ensure body overflow is not stuck at 'hidden'
    const hasOpenModal = document.querySelector('[role="dialog"]');
    const hasOpenSidebar = document.querySelector('.sidebar-open');

    if (!hasOpenModal && !hasOpenSidebar) {
      document.body.style.overflow = '';
    }
  }, []);

  return (
    <ThemeProvider>
      <UserProfileProvider>
        <AuthProvider>
          <BrowserRouter>
          {/* O fundo animado (3 blobs desfocados) e o cursor de vidro foram
              removidos no redesenho editorial: ambos são tells de interface
              gerada e nenhum dos dois carregava informação. Ver design.md. */}

          {/* Welcome Modal for First-Time Visitors */}
          <WelcomeModal />

          {/* Sucesso silencioso: toast só para falha, ação assíncrona cujo efeito
              não é visível, e confirmação que o usuário vai precisar reler. */}
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-ink)',
                color: 'var(--color-paper)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                maxWidth: '32rem',
              },
              success: {
                iconTheme: { primary: 'var(--color-paper)', secondary: 'var(--color-ink)' },
              },
              error: {
                duration: 6000,
                style: {
                  background: 'var(--color-danger)',
                  color: 'var(--color-accent-ink)',
                },
                iconTheme: { primary: 'var(--color-accent-ink)', secondary: 'var(--color-danger)' },
              },
            }}
          />

          <Suspense fallback={<LoadingMinimal />}>
            <Routes>
              {/* Public Routes */}
              {/* Public Pages with Dynamic Layout (Sidebar if logged in) */}
              <Route element={<PublicPageWrapper />}>
                <Route path="/" element={<LandingPageWrapper />} />
                <Route path="/cursos" element={<Courses />} />
                <Route path="/cursos/:id" element={<CourseDetail />} />
                <Route path="/termos" element={<Terms />} />
                <Route path="/privacidade" element={<Privacy />} />
                <Route path="/comprar/:cursoId" element={<Checkout />} />
                <Route path="/compra/status" element={<PaymentStatus />} />
                <Route path="/ativar" element={<Ativar />} />
                <Route path="/materiais" element={<Materiais />} />
                <Route path="/materiais/comprar/:id" element={<MaterialCheckout />} />
                <Route path="/materiais/compra/status" element={<MaterialPaymentStatus />} />
                <Route path="/materiais/acesso" element={<MaterialAccess />} />
                <Route path="/materiais/:id" element={<MaterialDetail />} />
              </Route>

              {/* Public Auth Routes (Always no sidebar) */}
              <Route element={<PublicLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                {/* Link enviado por e-mail na recuperação de senha */}
                <Route path="/redefinir-senha" element={<ResetPassword />} />
              </Route>

              {/* Public Certificate Validation (standalone page) */}
              <Route path="/validar" element={<ValidateCertificate />} />

              {/* Authenticated Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/aulas/:id" element={<Lesson />} />
                <Route path="/minhas-aulas" element={<Dashboard />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/forum/:id" element={<ForumTopic />} />
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute requireAluno>
                      <AppDownload />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/exercicios"
                  element={
                    <ProtectedRoute requireAluno>
                      <Exercises />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/exercicios/:id"
                  element={
                    <ProtectedRoute requireAluno>
                      <Exercises />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Admin Routes */}
              <Route
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/usuarios" element={<AdminUsers />} />
                <Route path="/admin/cursos" element={<AdminCourses />} />
                <Route path="/admin/aulas" element={<AdminLessons />} />
                <Route path="/admin/exercicios" element={<AdminExercises />} />
                <Route path="/admin/serial-keys" element={<AdminSerialKeys />} />
                <Route path="/admin/pagamentos" element={<AdminPayments />} />
                <Route path="/admin/materiais" element={<AdminMaterials />} />
                <Route path="/admin/avisos" element={<AdminAnnouncements />} />
                <Route path="/admin/logs" element={<AdminAccessLogs />} />
                <Route path="/admin/configuracoes" element={<AdminSiteConfig />} />
                <Route path="/admin/certificados" element={<AdminCertificates />} />
                <Route path="/admin/solicitacoes-certificado" element={<AdminCertificateRequests />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </UserProfileProvider>
    </ThemeProvider>
  );
};

export default App;

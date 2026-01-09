import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PublicLayout, AuthenticatedLayout, AdminLayout, PublicPageWrapper } from './components/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import { AnimatedBackground } from './components/ui';
import { LoadingMinimal } from './components/common/Loading';
import WelcomeModal from './components/common/WelcomeModal';

// Home é carregada diretamente (sem lazy) para eliminar loading na landing page
import Home from './pages/Home';

// Lazy load pages for better performance
// Public Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

// Authenticated Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Profile = lazy(() => import('./pages/Profile'));
const Forum = lazy(() => import('./pages/Forum'));
const ForumTopic = lazy(() => import('./pages/ForumTopic'));
const Exercises = lazy(() => import('./pages/Exercises'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const AdminLessons = lazy(() => import('./pages/admin/AdminLessons'));
const AdminSerialKeys = lazy(() => import('./pages/admin/AdminSerialKeys'));
const AdminAccessLogs = lazy(() => import('./pages/admin/AdminAccessLogs'));
const AdminExercises = lazy(() => import('./pages/admin/AdminExercises'));
const AdminSiteConfig = lazy(() => import('./pages/admin/AdminSiteConfig'));

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Animated Background */}
          <AnimatedBackground intensity="subtle" />

          {/* Welcome Modal for First-Time Visitors */}
          <WelcomeModal />

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--glass-bg)',
                color: 'var(--color-text-primary)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
              },
              success: {
                style: {
                  background: 'rgba(16, 185, 129, 0.9)',
                  color: '#fff',
                },
              },
              error: {
                style: {
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: '#fff',
                },
              },
            }}
          />

          <Suspense fallback={<LoadingMinimal />}>
            <Routes>
              {/* Public Routes */}
              {/* Public Pages with Dynamic Layout (Sidebar if logged in) */}
              <Route element={<PublicPageWrapper />}>
                <Route path="/" element={<Home />} />
                <Route path="/cursos" element={<Courses />} />
                <Route path="/cursos/:id" element={<CourseDetail />} />
                <Route path="/termos" element={<Terms />} />
                <Route path="/privacidade" element={<Privacy />} />
              </Route>

              {/* Public Auth Routes (Always no sidebar) */}
              <Route element={<PublicLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
              </Route>

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
                <Route path="/admin/logs" element={<AdminAccessLogs />} />
                <Route path="/admin/configuracoes" element={<AdminSiteConfig />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

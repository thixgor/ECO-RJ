import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard, GlassInput, GlassButton } from '../components/ui';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate(from, { replace: true });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao fazer login';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/30">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Entre na sua conta ECO RJ
          </p>
        </div>

        {/* Form Card */}
        <GlassCard hover={false} padding="xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <GlassCard hover={false} padding="md" className="!bg-red-500/10 border-red-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm text-red-500 dark:text-red-400">{error}</span>
                </div>
              </GlassCard>
            )}

            <GlassInput
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              leftIcon={<Mail className="w-5 h-5" />}
              required
            />

            <div className="relative">
              <GlassInput
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                required
              />
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              isLoading={isLoading}
              fullWidth
              size="lg"
              rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </GlassButton>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--glass-border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-[var(--glass-bg)] text-sm text-[var(--color-text-muted)] rounded-full">
                ou
              </span>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-[var(--color-text-muted)]">
              Não tem uma conta?{' '}
              <Link
                to="/registro"
                className="text-primary-500 hover:text-primary-600 font-semibold transition-colors"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </GlassCard>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex justify-center gap-4 text-sm">
            <Link
              to="/termos"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Termos de Serviço
            </Link>
            <span className="text-[var(--color-text-muted)]">·</span>
            <Link
              to="/privacidade"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Privacidade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

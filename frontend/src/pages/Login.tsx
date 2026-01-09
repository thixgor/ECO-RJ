import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, GraduationCap, ArrowRight, Key, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard, GlassInput, GlassButton } from '../components/ui';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

type RecoveryStep = 'email' | 'token' | 'password';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

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

  const openRecoveryModal = () => {
    setShowRecoveryModal(true);
    setRecoveryStep('email');
    setRecoveryEmail('');
    setRecoveryToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setRecoveryError('');
  };

  const handleRecoveryEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim() || !/\S+@\S+\.\S+/.test(recoveryEmail)) {
      setRecoveryError('Digite um e-mail válido');
      return;
    }
    setRecoveryError('');
    setRecoveryStep('token');
  };

  const handleRecoveryTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryToken.trim()) {
      setRecoveryError('Digite seu token de recuperação');
      return;
    }
    setRecoveryError('');
    setRecoveryStep('password');
  };

  const handleRecoveryPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      setRecoveryError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setRecoveryError('As senhas não conferem');
      return;
    }

    setIsRecovering(true);
    setRecoveryError('');

    try {
      const response = await authService.resetPassword(recoveryEmail, recoveryToken, newPassword);
      const data = response.data;

      // Login automático
      localStorage.setItem('token', data.token);

      toast.success('Senha redefinida com sucesso!');
      setShowRecoveryModal(false);

      // Recarregar a página para atualizar o estado de autenticação
      window.location.href = '/dashboard';
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao redefinir senha';
      setRecoveryError(message);
      toast.error(message);
    } finally {
      setIsRecovering(false);
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

            {/* Forgot password link */}
            <div className="text-right">
              <button
                type="button"
                onClick={openRecoveryModal}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                Esqueci minha senha
              </button>
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

      {/* Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Recuperar Senha</h2>
                  <p className="text-white/80 text-sm">
                    {recoveryStep === 'email' && 'Etapa 1 de 3 - Informe seu e-mail'}
                    {recoveryStep === 'token' && 'Etapa 2 de 3 - Informe seu token'}
                    {recoveryStep === 'password' && 'Etapa 3 de 3 - Nova senha'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step 1: Email */}
              {recoveryStep === 'email' && (
                <form onSubmit={handleRecoveryEmailSubmit} className="space-y-4">
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    Digite o e-mail da sua conta para iniciar a recuperação de senha.
                  </p>

                  <div>
                    <label className="label">E-mail da conta</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="input pl-10"
                        placeholder="seu@email.com"
                        autoFocus
                      />
                    </div>
                  </div>

                  {recoveryError && (
                    <p className="text-red-500 text-sm">{recoveryError}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRecoveryModal(false)}
                      className="btn btn-outline flex-1"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary flex-1">
                      Continuar
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Token */}
              {recoveryStep === 'token' && (
                <form onSubmit={handleRecoveryTokenSubmit} className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
                    <p className="text-amber-700 dark:text-amber-400 text-sm">
                      <strong>Você lembra do seu token de recuperação?</strong>
                      <br /><br />
                      Este é o token que foi exibido quando você criou sua conta. Sem ele, não é possível recuperar a senha.
                    </p>
                  </div>

                  <div>
                    <label className="label">Token de Recuperação</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={recoveryToken}
                        onChange={(e) => setRecoveryToken(e.target.value.toUpperCase())}
                        className="input pl-10 font-mono tracking-wider"
                        placeholder="XXXXXXXXXXXXXXXX"
                        autoFocus
                      />
                    </div>
                  </div>

                  {recoveryError && (
                    <p className="text-red-500 text-sm">{recoveryError}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep('email')}
                      className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    <button type="submit" className="btn btn-primary flex-1">
                      Continuar
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: New Password */}
              {recoveryStep === 'password' && (
                <form onSubmit={handleRecoveryPasswordSubmit} className="space-y-4">
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    Defina sua nova senha. A senha deve ter no mínimo 6 caracteres.
                  </p>

                  <div>
                    <label className="label">Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input pl-10"
                        placeholder="Mínimo 6 caracteres"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Confirmar Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="input pl-10"
                        placeholder="Repita a nova senha"
                      />
                    </div>
                  </div>

                  {recoveryError && (
                    <p className="text-red-500 text-sm">{recoveryError}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep('token')}
                      className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                      disabled={isRecovering}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                      disabled={isRecovering}
                    >
                      {isRecovering ? (
                        'Redefinindo...'
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Redefinir Senha
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;


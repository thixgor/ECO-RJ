import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, GraduationCap, ArrowRight, Key, ArrowLeft, CheckCircle,
  MailCheck, ShieldCheck, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard, GlassInput, GlassButton } from '../components/ui';
import { authService, materialService } from '../services/api';
import toast from 'react-hot-toast';

/**
 * A recuperação de senha tem DOIS caminhos:
 *
 *  - 'link'  (recomendado): a pessoa informa o e-mail e recebe um link de uso
 *    único, válido por 30 minutos. Não exige guardar nada.
 *  - 'token' (legado): usa o token permanente exibido/baixado no cadastro. Serve
 *    para quem perdeu o acesso ao e-mail — e continua funcionando se o servidor
 *    estiver sem envio de e-mails configurado.
 */
type RecoveryStep = 'metodo' | 'linkEmail' | 'linkEnviado' | 'email' | 'token' | 'password';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('metodo');
  // Se o servidor não tem SMTP configurado, a opção "link por e-mail" some
  // (não adianta oferecer um caminho que não entrega nada).
  const [emailRecoveryDisponivel, setEmailRecoveryDisponivel] = useState(true);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');

      // Vincula um material comprado como convidado (se houver token pendente)
      const pendingMaterial = sessionStorage.getItem('pendingMaterialToken');
      if (pendingMaterial) {
        sessionStorage.removeItem('pendingMaterialToken');
        try {
          await materialService.claim(pendingMaterial);
          toast.success('Material vinculado à sua conta!');
        } catch { /* segue o fluxo normal mesmo se falhar */ }
        navigate('/perfil?tab=materiais', { replace: true });
        return;
      }

      const pendingKey = sessionStorage.getItem('pendingSerialKey');
      if (pendingKey) {
        sessionStorage.removeItem('pendingSerialKey');
        navigate(`/ativar?codigo=${pendingKey}`, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
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
    setRecoveryStep('metodo');
    setRecoveryEmail('');
    setRecoveryToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setRecoveryError('');

    // Descobre se o envio de e-mail está ativo no servidor.
    authService
      .getRecoveryOptions()
      .then((res) => setEmailRecoveryDisponivel(res.data?.emailDisponivel !== false))
      .catch(() => setEmailRecoveryDisponivel(true));
  };

  // A página de redefinição manda de volta para cá com ?recuperar=1 quando o
  // link expirou — abrir o modal direto evita um clique desnecessário.
  useEffect(() => {
    if (searchParams.get('recuperar') === '1') {
      openRecoveryModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Caminho recomendado: envia o link de redefinição para o e-mail. */
  const handleSendRecoveryLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim() || !/\S+@\S+\.\S+/.test(recoveryEmail)) {
      setRecoveryError('Digite um e-mail válido');
      return;
    }

    setIsRecovering(true);
    setRecoveryError('');
    try {
      await authService.forgotPassword(recoveryEmail.trim());
      // A resposta do servidor é sempre a mesma, exista ou não a conta — por
      // isso a tela seguinte não afirma que o e-mail existe.
      setRecoveryStep('linkEnviado');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.';
      setRecoveryError(message);
    } finally {
      setIsRecovering(false);
    }
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

    // Mesma política do servidor: 8+ caracteres, com letra e número.
    if (newPassword.length < 8 || !/[A-Za-zÀ-ÿ]/.test(newPassword) || !/\d/.test(newPassword)) {
      setRecoveryError('A senha deve ter no mínimo 8 caracteres, incluindo pelo menos uma letra e um número.');
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
    <div className="min-h-[85dvh] flex items-center justify-center py-12 px-4">
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
                    {recoveryStep === 'metodo' && 'Como você quer recuperar sua conta?'}
                    {recoveryStep === 'linkEmail' && 'Link de redefinição por e-mail'}
                    {recoveryStep === 'linkEnviado' && 'Verifique seu e-mail'}
                    {recoveryStep === 'email' && 'Token de recuperação · Etapa 1 de 3'}
                    {recoveryStep === 'token' && 'Token de recuperação · Etapa 2 de 3'}
                    {recoveryStep === 'password' && 'Token de recuperação · Etapa 3 de 3'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Escolha do método */}
              {recoveryStep === 'metodo' && (
                <div className="space-y-3">
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    Escolha como quer recuperar o acesso à sua conta.
                  </p>

                  {emailRecoveryDisponivel && (
                    <button
                      type="button"
                      onClick={() => { setRecoveryError(''); setRecoveryStep('linkEmail'); }}
                      className="w-full text-left p-4 rounded-xl border border-[var(--glass-border)] hover:border-primary-500 hover:bg-primary-500/5 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                          <MailCheck className="w-5 h-5 text-primary-500" />
                        </span>
                        <span className="flex-1">
                          <span className="block font-semibold text-[var(--color-text-primary)]">
                            Receber link por e-mail
                            <span className="ml-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              Recomendado
                            </span>
                          </span>
                          <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">
                            Enviamos um link seguro, válido por 30 minutos e de uso único.
                          </span>
                        </span>
                        <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setRecoveryError(''); setRecoveryStep('email'); }}
                    className="w-full text-left p-4 rounded-xl border border-[var(--glass-border)] hover:border-primary-500 hover:bg-primary-500/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                        <Key className="w-5 h-5 text-amber-500" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold text-[var(--color-text-primary)]">
                          Usar meu token de recuperação
                        </span>
                        <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">
                          O código exibido quando você criou a conta. Use se perdeu o acesso ao e-mail.
                        </span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                    </span>
                  </button>

                  {!emailRecoveryDisponivel && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      O envio de e-mails está indisponível no servidor no momento, então a
                      recuperação por link não pode ser usada agora.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="btn btn-outline w-full mt-2"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Caminho recomendado: pedir o link por e-mail */}
              {recoveryStep === 'linkEmail' && (
                <form onSubmit={handleSendRecoveryLink} className="space-y-4">
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    Informe o e-mail da sua conta. Enviaremos um link seguro para você criar
                    uma nova senha.
                  </p>

                  <div>
                    <label className="label">E-mail da conta</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-neutral)]" />
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="input pl-10"
                        placeholder="seu@email.com"
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>
                      Por segurança, respondemos sempre da mesma forma — não informamos se um
                      e-mail tem conta cadastrada. O link vale por 30 minutos e só funciona uma vez.
                    </span>
                  </div>

                  {recoveryError && <p className="text-red-500 text-sm">{recoveryError}</p>}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setRecoveryError(''); setRecoveryStep('metodo'); }}
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
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar link'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Confirmação de envio */}
              {recoveryStep === 'linkEnviado' && (
                <div className="space-y-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                    <MailCheck className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-lg">Verifique seu e-mail</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Se houver uma conta com <strong>{recoveryEmail}</strong>, o link de
                    redefinição já está a caminho. Ele vale por <strong>30 minutos</strong>.
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Não encontrou? Confira a caixa de spam/lixo eletrônico antes de pedir outro link.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setRecoveryError(''); setRecoveryStep('linkEmail'); }}
                      className="btn btn-outline flex-1"
                    >
                      Reenviar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRecoveryModal(false)}
                      className="btn btn-primary flex-1"
                    >
                      Entendi
                    </button>
                  </div>
                </div>
              )}

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
                      onClick={() => { setRecoveryError(''); setRecoveryStep('metodo'); }}
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
                    Defina sua nova senha: mínimo de 8 caracteres, com pelo menos uma letra e um número.
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
                        placeholder="Mínimo 8 caracteres, com letra e número"
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


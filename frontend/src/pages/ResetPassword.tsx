import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle, Loader2, ArrowRight, KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassButton, GlassInput } from '../components/ui';
import { authService } from '../services/api';

/**
 * Página do link enviado por e-mail (/redefinir-senha?token=...).
 *
 * O token nunca é digitado pelo usuário: ele chega na URL, é validado no
 * servidor antes de mostrarmos o formulário e só pode ser usado uma vez.
 * Depois de redefinir NÃO fazemos login automático — quem chegar ao link
 * precisa também saber a senha nova para entrar.
 */

type Etapa = 'validando' | 'invalido' | 'formulario' | 'concluido';

/** Mesma política do servidor (utils/validators.ts). */
const avaliarSenha = (senha: string) => {
  const criterios = [
    { ok: senha.length >= 8, texto: 'Pelo menos 8 caracteres' },
    { ok: /[A-Za-zÀ-ÿ]/.test(senha), texto: 'Pelo menos uma letra' },
    { ok: /\d/.test(senha), texto: 'Pelo menos um número' }
  ];
  const extras = [
    senha.length >= 12,
    /[A-ZÀ-Ý]/.test(senha) && /[a-zà-ÿ]/.test(senha),
    /[^A-Za-zÀ-ÿ0-9]/.test(senha)
  ].filter(Boolean).length;

  const basicosOk = criterios.every((c) => c.ok);
  const forca = !basicosOk ? 0 : Math.min(3, 1 + extras);
  return { criterios, basicosOk, forca };
};

const ROTULO_FORCA = ['Fraca', 'Aceitável', 'Boa', 'Forte'];
const COR_FORCA = ['bg-red-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];

const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState<Etapa>('validando');
  const [erro, setErro] = useState('');
  const [emailMascarado, setEmailMascarado] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const avaliacao = useMemo(() => avaliarSenha(senha), [senha]);

  useEffect(() => {
    const validar = async () => {
      if (!token) {
        setErro('Link inválido: nenhum código de redefinição foi informado.');
        setEtapa('invalido');
        return;
      }
      try {
        const res = await authService.validateResetToken(token);
        setEmailMascarado(res.data?.emailMascarado || '');
        setEtapa('formulario');
      } catch (err: any) {
        setErro(
          err.response?.data?.message ||
          'Este link de redefinição é inválido, já foi usado ou expirou. Solicite um novo.'
        );
        setEtapa('invalido');
      }
    };
    validar();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!avaliacao.basicosOk) {
      setErro('A senha deve ter no mínimo 8 caracteres, incluindo pelo menos uma letra e um número.');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }

    setEnviando(true);
    try {
      await authService.confirmPasswordReset(token, senha);
      setEtapa('concluido');
      toast.success('Senha redefinida! Entre com a sua nova senha.');
    } catch (err: any) {
      const mensagem = err.response?.data?.message || 'Não foi possível redefinir a senha.';
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[85dvh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/30">
            <KeyRound className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            Nova senha
          </h1>
          <p className="text-[var(--color-text-muted)]">
            {emailMascarado ? `Redefinindo a senha de ${emailMascarado}` : 'Redefinição de senha da conta ECO RJ'}
          </p>
        </div>

        <GlassCard hover={false} padding="xl">
          {etapa === 'validando' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <p className="text-[var(--color-text-muted)] text-sm">Verificando o link...</p>
            </div>
          )}

          {etapa === 'invalido' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg mb-2">Link não utilizável</h2>
                <p className="text-sm text-[var(--color-text-muted)]">{erro}</p>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Por segurança, cada link vale por 30 minutos e só pode ser usado uma vez.
              </p>
              <GlassButton
                variant="primary"
                fullWidth
                onClick={() => navigate('/login?recuperar=1')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Solicitar um novo link
              </GlassButton>
            </div>
          )}

          {etapa === 'concluido' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg mb-2">Senha redefinida!</h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Sua senha foi alterada e todas as sessões abertas com a senha antiga
                  foram encerradas. Entre agora com a nova senha.
                </p>
              </div>
              <GlassButton
                variant="primary"
                fullWidth
                onClick={() => navigate('/login')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Ir para o login
              </GlassButton>
            </div>
          )}

          {etapa === 'formulario' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {erro && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-500 dark:text-red-400">{erro}</span>
                </div>
              )}

              <GlassInput
                label="Nova senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Crie uma senha forte"
                autoComplete="new-password"
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                autoFocus
                required
              />

              {/* Medidor de força: mostra o que falta em vez de só reprovar */}
              {senha && (
                <div className="space-y-2 -mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${COR_FORCA[avaliacao.forca]}`}
                        style={{ width: `${((avaliacao.forca + 1) / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {ROTULO_FORCA[avaliacao.forca]}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {avaliacao.criterios.map((c) => (
                      <li
                        key={c.texto}
                        className={`text-xs flex items-center gap-2 ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--color-text-muted)]'}`}
                      >
                        <CheckCircle className={`w-3.5 h-3.5 ${c.ok ? 'opacity-100' : 'opacity-30'}`} />
                        {c.texto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <GlassInput
                label="Confirmar nova senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                leftIcon={<Lock className="w-5 h-5" />}
                error={confirmacao && senha !== confirmacao ? 'As senhas não conferem' : undefined}
                required
              />

              <GlassButton
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                isLoading={enviando}
                disabled={enviando}
                leftIcon={!enviando && <ShieldCheck className="w-5 h-5" />}
              >
                {enviando ? 'Redefinindo...' : 'Redefinir senha'}
              </GlassButton>

              <p className="text-xs text-[var(--color-text-muted)] text-center leading-relaxed">
                Ao redefinir, todas as sessões abertas com a senha anterior serão encerradas
                e você receberá um e-mail confirmando a alteração.
              </p>
            </form>
          )}
        </GlassCard>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

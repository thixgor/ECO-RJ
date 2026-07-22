import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassButton, GlassInput } from '../components/ui';
import { userService, authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Ativar: React.FC = () => {
  const [params] = useSearchParams();
  const codigoUrl = params.get('codigo') || '';
  const navigate = useNavigate();
  const { isAuthenticated, updateUser } = useAuth();

  const [codigo, setCodigo] = useState(codigoUrl);
  const [ativando, setAtivando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    setCodigo(codigoUrl);
  }, [codigoUrl]);

  const handleAtivar = async () => {
    if (!codigo.trim()) return toast.error('Informe o código de ativação');
    setAtivando(true);
    try {
      const res = await userService.applySerialKey(codigo.trim().toUpperCase());
      toast.success(res.data.message || 'Curso ativado com sucesso!');
      setSucesso(true);
      // Atualiza usuário no contexto
      try {
        const me = await authService.getMe();
        updateUser(me.data);
      } catch { /* noop */ }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível ativar');
    } finally {
      setAtivando(false);
    }
  };

  // Guarda o código para retomar após login/registro
  const goAuth = (path: string) => {
    if (codigo) sessionStorage.setItem('pendingSerialKey', codigo.trim().toUpperCase());
    navigate(path);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <GlassCard className="p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-500/15 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-heading font-bold">Ativar Curso</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            Use a chave de ativação recebida por e-mail para liberar seu acesso.
          </p>
        </div>

        {sucesso ? (
          <div className="text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acesso liberado!</h2>
            <p className="text-[var(--color-text-muted)] mb-6">Seu curso já está disponível na sua conta.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/dashboard"><GlassButton variant="primary">Ir para o Dashboard</GlassButton></Link>
              <Link to="/cursos"><GlassButton variant="secondary">Ver cursos</GlassButton></Link>
            </div>
          </div>
        ) : isAuthenticated ? (
          <div className="space-y-4">
            <GlassInput
              label="Código de ativação"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="ECO-XXXXXX-XXXXXXXX"
              leftIcon={<KeyRound className="w-4 h-4" />}
            />
            <GlassButton
              variant="primary"
              fullWidth
              onClick={handleAtivar}
              isLoading={ativando}
              disabled={ativando}
            >
              {ativando ? 'Ativando...' : 'Ativar curso'}
            </GlassButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-secondary)]">
              {codigo && (
                <p className="mb-2">
                  Chave: <code className="font-mono font-bold text-primary-500">{codigo}</code>
                </p>
              )}
              Para ativar seu curso, entre na sua conta ou crie uma. Guardamos sua chave e ativaremos automaticamente.
            </div>
            <GlassButton variant="primary" fullWidth onClick={() => goAuth('/login')} leftIcon={<LogIn className="w-5 h-5" />}>
              Já tenho conta — Entrar
            </GlassButton>
            <GlassButton variant="secondary" fullWidth onClick={() => goAuth('/registro')} leftIcon={<UserPlus className="w-5 h-5" />}>
              Criar minha conta
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Ativar;

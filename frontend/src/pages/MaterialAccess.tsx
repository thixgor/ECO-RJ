import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, XCircle, ShieldCheck, LogIn, UserPlus, LinkIcon, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassButton, GlassInput } from '../components/ui';
import MaterialContentViewer from '../components/materials/MaterialContentViewer';
import { materialService, authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { MaterialDetalhe } from '../types';
import { formatarData } from '../utils/datetime';

const MaterialAccess: React.FC = () => {
  const [params] = useSearchParams();
  const tokenUrl = params.get('token') || '';
  const { isAuthenticated, updateUser } = useAuth();

  const [token, setToken] = useState(tokenUrl);
  const [codigoManual, setCodigoManual] = useState('');
  const [loading, setLoading] = useState(!!tokenUrl);
  const [erro, setErro] = useState<string | null>(null);
  const [material, setMaterial] = useState<MaterialDetalhe | null>(null);
  const [serialKey, setSerialKey] = useState<string | null>(null);
  const [validade, setValidade] = useState<string | null>(null);
  const [comprador, setComprador] = useState<{ nome?: string; cpf?: string; email?: string } | null>(null);
  const [vinculando, setVinculando] = useState(false);

  const load = async (t: string) => {
    if (!t) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await materialService.getAccess(t);
      setMaterial(res.data.material);
      setSerialKey(res.data.serialKey);
      setValidade(res.data.validade || null);
      setComprador(res.data.comprador || (res.data.email ? { email: res.data.email } : null));
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Acesso não encontrado ou inválido.');
      setMaterial(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setToken(tokenUrl);
    if (tokenUrl) load(tokenUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenUrl]);

  const handleVincular = async () => {
    const codigo = token || codigoManual.trim();
    if (!codigo) return;
    setVinculando(true);
    try {
      await materialService.claim(codigo);
      toast.success('Material vinculado à sua conta! Veja em "Meus Materiais".');
      try {
        const me = await authService.getMe();
        updateUser(me.data);
      } catch { /* noop */ }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível vincular');
    } finally {
      setVinculando(false);
    }
  };

  const goAuth = () => {
    // Guarda o token/código para vincular após login/registro
    const codigo = token || codigoManual.trim();
    if (codigo) sessionStorage.setItem('pendingMaterialToken', codigo);
  };

  // Sem token na URL: formulário para informar o código/token
  if (!tokenUrl && !material) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <GlassCard className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-500/15 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-2xl font-heading font-bold">Acessar material</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              Informe o código de acesso recebido por e-mail (ou abra o link do e-mail).
            </p>
          </div>
          <GlassInput
            label="Código de acesso"
            value={codigoManual}
            onChange={(e) => setCodigoManual(e.target.value.trim())}
            placeholder="ECO-MAT-XXXXXX-XXXXXX"
            leftIcon={<KeyRound className="w-4 h-4" />}
          />
          <div className="mt-4">
            <GlassButton
              variant="primary"
              fullWidth
              onClick={() => { setToken(codigoManual.trim()); load(codigoManual.trim()); }}
              disabled={!codigoManual.trim()}
            >
              Acessar
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (erro || !material) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <GlassCard className="p-8">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Não foi possível acessar</h1>
          <p className="text-[var(--color-text-muted)] mb-6">{erro || 'Acesso inválido.'}</p>
          <Link to="/materiais"><GlassButton variant="primary">Ver materiais</GlassButton></Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <GlassCard className="p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-1">
              <ShieldCheck className="w-4 h-4" /> Acesso liberado
            </div>
            <h1 className="text-2xl font-heading font-bold text-[var(--color-text-primary)]">{material.titulo}</h1>
            {serialKey && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Código: <code className="font-mono font-semibold text-primary-500">{serialKey}</code>
              </p>
            )}
            {validade && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Acesso válido até {formatarData(validade)}
              </p>
            )}
          </div>
        </div>

        {/* Vincular à conta */}
        <div className="mt-4 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          {isAuthenticated ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Salve este material permanentemente na sua conta.
              </p>
              <GlassButton variant="secondary" size="sm" onClick={handleVincular} isLoading={vinculando} disabled={vinculando} leftIcon={<LinkIcon className="w-4 h-4" />}>
                Vincular à minha conta
              </GlassButton>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Crie uma conta (ou entre) com o mesmo e-mail da compra para salvar este material em "Meus Materiais".
              </p>
              <div className="flex gap-2 flex-wrap">
                <Link to="/login" onClick={goAuth}>
                  <GlassButton variant="secondary" size="sm" leftIcon={<LogIn className="w-4 h-4" />}>Entrar</GlassButton>
                </Link>
                <Link to="/registro" onClick={goAuth}>
                  <GlassButton variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>Criar conta</GlassButton>
                </Link>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-heading font-bold text-lg mb-4">Conteúdo</h2>
        <MaterialContentViewer conteudos={material.conteudos} identity={comprador || undefined} />
      </GlassCard>
    </div>
  );
};

export default MaterialAccess;

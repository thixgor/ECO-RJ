import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, XCircle, Loader2, Copy, KeyRound, ArrowRight, RefreshCw, Download, MailWarning
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassButton } from '../components/ui';
import { materialService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

interface StatusData {
  numeroPedido: string;
  materialId: string;
  materialTitulo: string;
  status: string;
  entregue: boolean;
  emailEnviado?: boolean;
  metodoPagamento?: string;
  valores?: { total: number };
  compradorNome?: string;
  compradorEmail?: string;
  createdAt?: string;
  isGuest?: boolean;
  serialKeyCodigo?: string;
  accessToken?: string;
  accessLink?: string;
  materialLink?: string;
}

const MaterialPaymentStatus: React.FC = () => {
  const [params] = useSearchParams();
  const numeroPedido = params.get('pedido') || '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [order, setOrder] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const fetchStatus = async (doSync = false) => {
    if (!numeroPedido) return;
    try {
      if (doSync) await materialService.syncOrder(numeroPedido).catch(() => {});
      const res = await materialService.getOrderStatus(numeroPedido);
      setOrder(res.data);
      if (['aprovado', 'rejeitado', 'cancelado'].includes(res.data.status)) {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!numeroPedido) { setLoading(false); return; }
    fetchStatus(true);
    pollRef.current = setInterval(() => {
      attemptsRef.current += 1;
      fetchStatus(attemptsRef.current % 3 === 0);
      if (attemptsRef.current > 45) { if (pollRef.current) clearInterval(pollRef.current); }
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroPedido]);

  const copyKey = () => {
    if (order?.serialKeyCodigo) {
      navigator.clipboard.writeText(order.serialKeyCodigo);
      toast.success('Código copiado!');
    }
  };

  const handleResend = async () => {
    if (!order?.compradorEmail) return;
    setResending(true);
    try {
      const res = await materialService.recover(order.compradorEmail);
      toast.success(res.data.message || 'Acessos reenviados. Verifique seu e-mail e o spam.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível reenviar');
    } finally {
      setResending(false);
    }
  };

  if (!numeroPedido) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <GlassCard className="p-8">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Pedido não informado</h1>
          <Link to="/materiais"><GlassButton variant="primary">Ver materiais</GlassButton></Link>
        </GlassCard>
      </div>
    );
  }

  if (loading && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <p className="text-[var(--color-text-muted)]">Consultando pagamento...</p>
      </div>
    );
  }

  const status = order?.status || 'pendente';
  const aprovado = status === 'aprovado';
  const rejeitado = status === 'rejeitado' || status === 'cancelado';
  const pendente = !aprovado && !rejeitado;

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <GlassCard className="p-8 text-center">
        {aprovado && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-heading font-bold mb-1">Compra aprovada!</h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              Sua compra de <strong>{order?.materialTitulo}</strong> foi confirmada.
            </p>
          </>
        )}
        {pendente && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-9 h-9 text-amber-500 animate-pulse" />
            </div>
            <h1 className="text-2xl font-heading font-bold mb-1">Aguardando pagamento</h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              Assim que o pagamento for confirmado, esta página será atualizada automaticamente.
            </p>
          </>
        )}
        {rejeitado && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
            <h1 className="text-2xl font-heading font-bold mb-1">Pagamento não concluído</h1>
            <p className="text-[var(--color-text-muted)] mb-6">Não foi possível confirmar seu pagamento. Você pode tentar novamente.</p>
          </>
        )}

        <div className="text-sm text-[var(--color-text-muted)] mb-6 space-y-1">
          <p>Pedido <strong>{order?.numeroPedido}</strong></p>
          {order?.valores && <p>Total: <strong>{brl(order.valores.total)}</strong></p>}
        </div>

        {/* Acesso do convidado — salvaguarda anti-perda do produto */}
        {aprovado && order?.isGuest && order?.serialKeyCodigo && (
          <div className="p-5 rounded-xl bg-primary-500/10 border border-primary-500/30 mb-6 text-left">
            <div className="flex items-center gap-2 mb-2 text-primary-600 dark:text-primary-400 font-semibold">
              <KeyRound className="w-5 h-5" /> Seu acesso
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Código de acesso (guarde-o):</p>
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 text-base font-mono font-bold tracking-wide bg-[var(--glass-bg)] px-3 py-2 rounded-lg break-all">
                {order.serialKeyCodigo}
              </code>
              <GlassButton variant="secondary" size="sm" onClick={copyKey} leftIcon={<Copy className="w-4 h-4" />}>Copiar</GlassButton>
            </div>
            {order.accessLink && (
              <a href={order.accessLink}>
                <GlassButton variant="primary" fullWidth leftIcon={<Download className="w-4 h-4" />}>
                  Acessar / Baixar meu material
                </GlassButton>
              </a>
            )}
            <p className="text-xs text-[var(--color-text-muted)] mt-3">
              Enviamos tudo para o seu e-mail. <strong>Não precisa esperar o e-mail</strong> para acessar —
              use o botão acima agora. Recomendamos criar uma conta com o mesmo e-mail para salvar em "Meus Materiais".
            </p>
          </div>
        )}

        {/* Alerta se o e-mail não pôde ser enviado */}
        {aprovado && order?.emailEnviado === false && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 mb-6 text-left">
            <p className="text-sm text-amber-800 dark:text-amber-400 flex items-start gap-2">
              <MailWarning className="w-5 h-5 flex-shrink-0" />
              <span>
                Não conseguimos confirmar o envio do e-mail, mas <strong>seu acesso está garantido</strong> aqui
                nesta página{order?.isGuest ? ' e pelo código/link acima' : ' e em "Meus Materiais"'}. Você pode reenviar o e-mail:
              </span>
            </p>
            <div className="mt-3">
              <GlassButton variant="secondary" size="sm" onClick={handleResend} isLoading={resending} disabled={resending} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Reenviar e-mail
              </GlassButton>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {aprovado && order?.materialLink && (
            <a href={order.materialLink}>
              <GlassButton variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>Ir para o material</GlassButton>
            </a>
          )}
          {aprovado && !order?.isGuest && (
            <GlassButton variant="secondary" onClick={() => navigate(isAuthenticated ? '/perfil' : '/login')}>
              Meus materiais
            </GlassButton>
          )}
          {pendente && (
            <GlassButton variant="secondary" onClick={() => fetchStatus(true)} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Atualizar status
            </GlassButton>
          )}
          {rejeitado && (
            <Link to="/materiais"><GlassButton variant="primary">Voltar aos materiais</GlassButton></Link>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default MaterialPaymentStatus;

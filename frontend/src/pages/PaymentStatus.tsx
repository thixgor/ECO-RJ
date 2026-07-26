import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, XCircle, Loader2, Copy, KeyRound, ArrowRight, RefreshCw, QrCode, Barcode, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassButton } from '../components/ui';
import { paymentService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

interface OrderStatusData {
  numeroPedido: string;
  cursoTitulo: string;
  status: string;
  statusDetail?: string;
  entregue: boolean;
  metodoPagamento?: string;
  valores?: { total: number };
  compradorNome?: string;
  createdAt?: string;
  isGuest?: boolean;
  serialKeyCodigo?: string;
  activationLink?: string;
  pix?: { qrCode?: string; qrCodeBase64?: string; ticketUrl?: string };
  boleto?: { url?: string; barcode?: string };
}

const PaymentStatus: React.FC = () => {
  const [params] = useSearchParams();
  const numeroPedido = params.get('pedido') || '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [order, setOrder] = useState<OrderStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const fetchStatus = async (doSync = false) => {
    if (!numeroPedido) return;
    try {
      if (doSync) {
        await paymentService.syncOrder(numeroPedido).catch(() => {});
      }
      const res = await paymentService.getOrderStatus(numeroPedido);
      setOrder(res.data);
      if (res.data.status === 'aprovado' || res.data.status === 'rejeitado' || res.data.status === 'cancelado') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!numeroPedido) {
      setLoading(false);
      return;
    }
    fetchStatus(true);
    // Poll a cada 4s enquanto pendente (com sync ocasional)
    pollRef.current = setInterval(() => {
      attemptsRef.current += 1;
      fetchStatus(attemptsRef.current % 3 === 0); // sync a cada 3 tentativas
      if (attemptsRef.current > 45) { // ~3 min
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroPedido]);

  const copyKey = () => {
    if (order?.serialKeyCodigo) {
      navigator.clipboard.writeText(order.serialKeyCodigo);
      toast.success('Chave copiada!');
    }
  };

  const copyPix = () => {
    if (order?.pix?.qrCode) {
      navigator.clipboard.writeText(order.pix.qrCode);
      toast.success('Código Pix copiado!');
    }
  };

  if (!numeroPedido) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <GlassCard className="p-8">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Pedido não informado</h1>
          <Link to="/cursos"><GlassButton variant="primary">Ver cursos</GlassButton></Link>
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
            <h1 className="text-2xl font-heading font-bold mb-1">Pagamento aprovado!</h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              Sua compra de <strong>{order?.cursoTitulo}</strong> foi confirmada.
            </p>
          </>
        )}
        {pendente && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-9 h-9 text-amber-500 animate-pulse" />
            </div>
            <h1 className="text-2xl font-heading font-bold mb-1">
              {order?.statusDetail === 'pending_challenge' ? 'Verificação do cartão pendente' : 'Aguardando pagamento'}
            </h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              {order?.statusDetail === 'pending_challenge'
                ? 'Seu banco pediu uma confirmação extra e ela ainda não foi concluída. Finalize a verificação no aplicativo do seu banco ou refaça a compra escolhendo outra forma de pagamento.'
                : 'Assim que o pagamento for confirmado, esta página será atualizada automaticamente.'}
            </p>
          </>
        )}
        {rejeitado && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
            <h1 className="text-2xl font-heading font-bold mb-1">Pagamento não concluído</h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              Não foi possível confirmar seu pagamento. Você pode tentar novamente.
            </p>
          </>
        )}

        <div className="text-sm text-[var(--color-text-muted)] mb-6 space-y-1">
          <p>Pedido <strong>{order?.numeroPedido}</strong></p>
          {order?.valores && <p>Total: <strong>{brl(order.valores.total)}</strong></p>}
        </div>

        {/* Pix pendente — QR Code + copia e cola */}
        {pendente && order?.pix?.qrCode && (
          <div className="p-5 rounded-xl bg-primary-500/10 border border-primary-500/30 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3 text-primary-600 dark:text-primary-400 font-semibold">
              <QrCode className="w-5 h-5" /> Pague com Pix para liberar o acesso
            </div>
            {order.pix.qrCodeBase64 && (
              <img
                src={`data:image/png;base64,${order.pix.qrCodeBase64}`}
                alt="QR Code Pix"
                className="w-48 h-48 mx-auto mb-4 rounded-lg bg-white p-2"
              />
            )}
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Ou copie o código Pix (copia e cola):</p>
            <div className="flex items-center gap-2 mb-1">
              <code className="flex-1 text-xs font-mono bg-[var(--glass-bg)] px-3 py-2 rounded-lg break-all max-h-20 overflow-y-auto">
                {order.pix.qrCode}
              </code>
              <GlassButton variant="secondary" size="sm" onClick={copyPix} leftIcon={<Copy className="w-4 h-4" />}>
                Copiar
              </GlassButton>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-3">
              Após o pagamento, esta página confirma automaticamente em alguns segundos.
            </p>
          </div>
        )}

        {/* Boleto pendente */}
        {pendente && order?.boleto?.url && (
          <div className="p-5 rounded-xl bg-primary-500/10 border border-primary-500/30 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3 text-primary-600 dark:text-primary-400 font-semibold">
              <Barcode className="w-5 h-5" /> Boleto gerado
            </div>
            {order.boleto.barcode && (
              <code className="block text-xs font-mono bg-[var(--glass-bg)] px-3 py-2 rounded-lg break-all mb-3">
                {order.boleto.barcode}
              </code>
            )}
            <a href={order.boleto.url} target="_blank" rel="noopener noreferrer">
              <GlassButton variant="primary" fullWidth rightIcon={<ExternalLink className="w-4 h-4" />}>
                Visualizar / imprimir boleto
              </GlassButton>
            </a>
            <p className="text-xs text-[var(--color-text-muted)] mt-3">
              A confirmação do boleto pode levar até 2 dias úteis. O acesso é liberado após a compensação.
            </p>
          </div>
        )}

        {/* Serial key para convidados */}
        {aprovado && order?.isGuest && order?.serialKeyCodigo && (
          <div className="p-5 rounded-xl bg-primary-500/10 border border-primary-500/30 mb-6 text-left">
            <div className="flex items-center gap-2 mb-2 text-primary-600 dark:text-primary-400 font-semibold">
              <KeyRound className="w-5 h-5" /> Sua chave de ativação
            </div>
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 text-lg font-mono font-bold tracking-wide bg-[var(--glass-bg)] px-3 py-2 rounded-lg break-all">
                {order.serialKeyCodigo}
              </code>
              <GlassButton variant="secondary" size="sm" onClick={copyKey} leftIcon={<Copy className="w-4 h-4" />}>
                Copiar
              </GlassButton>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Enviamos esta chave e o comprovante para o seu e-mail. Crie sua conta (ou faça login) e ative seu curso.
            </p>
            <Link to={`/ativar?codigo=${order.serialKeyCodigo}`}>
              <GlassButton variant="primary" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                Ativar meu curso
              </GlassButton>
            </Link>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {aprovado && !order?.isGuest && (
            <GlassButton variant="primary" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Ir para meus cursos
            </GlassButton>
          )}
          {aprovado && (
            <GlassButton variant="secondary" onClick={() => navigate(isAuthenticated ? '/perfil' : '/login')}>
              Ver comprovante
            </GlassButton>
          )}
          {pendente && (
            <GlassButton variant="secondary" onClick={() => fetchStatus(true)} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Atualizar status
            </GlassButton>
          )}
          {rejeitado && (
            <Link to="/cursos"><GlassButton variant="primary">Voltar aos cursos</GlassButton></Link>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default PaymentStatus;

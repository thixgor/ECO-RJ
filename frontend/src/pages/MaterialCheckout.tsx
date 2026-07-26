import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingCart, Tag, ShieldCheck, Loader2, ArrowLeft, CheckCircle2, Lock, PackageX, Mail, Gift,
  LogIn, UserPlus
} from 'lucide-react';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '../components/ui';
import MercadoPagoBrick from '../components/MercadoPagoBrick';
import ThreeDSChallenge, { ThreeDsChallengeData } from '../components/ThreeDSChallenge';
import { materialService, paymentService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { brl, formatPreco, isGratuito } from '../utils/price';
import type { MaterialDetalhe, OrderValores, PaymentConfig } from '../types';

interface CheckoutData {
  numeroPedido: string;
  publicKey: string;
  amount: number;
  payer: { nome: string; email: string; firstName: string; lastName: string; cpf: string };
  metodos: { pix: boolean; cartaoCredito: boolean; cartaoDebito: boolean; boleto: boolean };
  parcelasMaximas: number;
}

const maskCPF = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const maskPhone = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');

const MaterialCheckout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [material, setMaterial] = useState<MaterialDetalhe | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [valores, setValores] = useState<OrderValores | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cupom, setCupom] = useState('');
  const [cupomAplicado, setCupomAplicado] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [indisponivelMotivo, setIndisponivelMotivo] = useState<string | null>(null);
  const [threeDs, setThreeDs] = useState<ThreeDsChallengeData | null>(null);

  useEffect(() => {
    if (user) {
      setNome(user.nomeCompleto || '');
      setEmail(user.email || '');
      if (user.cpf) setCpf(maskCPF(user.cpf));
    }
  }, [user]);

  const refreshQuote = async (materialId: string, cupomCode?: string, emailForQuote?: string) => {
    try {
      const res = await materialService.quote({ materialId, cupom: cupomCode, email: emailForQuote });
      setValores(res.data.valores);
      if (cupomCode) {
        if (res.data.cupomValido) {
          setCupomAplicado(cupomCode.toUpperCase());
          toast.success('Cupom aplicado!');
        } else {
          setCupomAplicado(null);
          toast.error(res.data.cupomErro || 'Cupom inválido');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao calcular preço');
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [matRes, configRes] = await Promise.all([
          materialService.getById(id),
          paymentService.getConfig()
        ]);
        const m: MaterialDetalhe = matRes.data.material;
        setMaterial(m);
        setConfig(configRes.data);

        if (matRes.data.temAcesso) {
          setIndisponivelMotivo('Você já possui este material. Acesse-o na página do produto ou em "Meus Materiais".');
          return;
        }
        if (!m.disponivel) {
          setIndisponivelMotivo('Este material não está disponível no momento.');
          return;
        }
        // Material gratuito não depende do gateway de pagamento estar configurado.
        const liberado = isGratuito(m.preco)
          ? (configRes.data.adesaoGratuitaAtiva ?? configRes.data.vendasAtivas)
          : configRes.data.vendasAtivas;
        if (!liberado) {
          setIndisponivelMotivo('As inscrições estão temporariamente indisponíveis. Por favor, tente novamente mais tarde.');
          return;
        }

        await refreshQuote(id, undefined, user?.email);
      } catch (err: any) {
        if (err.response?.status === 404) {
          toast.error('Material não encontrado');
          navigate('/materiais');
        } else {
          setIndisponivelMotivo('Não foi possível carregar este material para compra no momento.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAplicarCupom = async () => {
    if (!id || !cupom.trim()) return;
    await refreshQuote(id, cupom.trim(), email);
  };
  const handleRemoverCupom = async () => {
    if (!id) return;
    setCupom('');
    setCupomAplicado(null);
    await refreshQuote(id, undefined, email);
  };

  const cpfValido = useMemo(() => cpf.replace(/\D/g, '').length === 11, [cpf]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (nome.trim().length < 3) return toast.error('Informe seu nome completo');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('E-mail inválido');
    if (telefone.replace(/\D/g, '').length < 10) return toast.error('Telefone inválido');
    if (!cpfValido) return toast.error('CPF inválido');
    if (!aceite) return toast.error('É necessário aceitar os Termos e Condições de Compra');

    setSubmitting(true);
    try {
      const res = await materialService.checkout({
        materialId: id,
        cupom: cupomAplicado || undefined,
        comprador: {
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.replace(/\D/g, ''),
          cpf: cpf.replace(/\D/g, '')
        },
        aceiteTermos: { aceito: true }
      });
      const data = res.data;
      if (data.gratuito) {
        toast.success('Acesso liberado! Aproveite o material.');
        navigate(`/materiais/compra/status?pedido=${data.numeroPedido}`);
        return;
      }
      // Checkout Transparente: avança para a etapa de pagamento (Payment Brick)
      setCheckoutData(data);
      setSubmitting(false);
    } catch (err: any) {
      // Servidor sem e-mail: convidado precisa entrar antes de comprar.
      if (err.response?.data?.loginObrigatorio) {
        setConfig((prev) => (prev ? { ...prev, compraSemLoginPermitida: false, emailConfigurado: false } : prev));
      }
      toast.error(err.response?.data?.message || 'Não foi possível iniciar o pagamento');
      setSubmitting(false);
    }
  };

  const handlePay = async (formData: any): Promise<{ ok: boolean; message?: string }> => {
    if (!checkoutData?.numeroPedido) return { ok: false };
    try {
      const res = await materialService.process(checkoutData.numeroPedido, formData);
      const d = res.data;
      // Autenticação 3-D Secure exigida pelo emissor (comum no cartão de débito)
      if (d.threeDs?.externalResourceUrl && d.threeDs?.creq) {
        setThreeDs(d.threeDs);
        return { ok: true };
      }
      if (d.status === 'aprovado' || d.status === 'em_processo' || d.status === 'pendente') {
        navigate(`/materiais/compra/status?pedido=${checkoutData.numeroPedido}`);
        return { ok: true };
      }
      toast.error('Pagamento não aprovado. Revise os dados e tente novamente.');
      return { ok: false, message: 'Pagamento não aprovado' };
    } catch (err: any) {
      const data = err.response?.data;
      console.error('Falha no pagamento (Mercado Pago):', data || err);
      toast.error(data?.motivo || data?.message || 'Não foi possível processar o pagamento');
      return { ok: false };
    }
  };

  /** Consulta o status do pedido durante o desafio 3-D Secure. */
  const checkOrderStatus = async (): Promise<string | null> => {
    if (!checkoutData?.numeroPedido) return null;
    try {
      await materialService.syncOrder(checkoutData.numeroPedido).catch(() => {});
      const res = await materialService.getOrderStatus(checkoutData.numeroPedido);
      return res.data?.status || null;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }
  if (!material) return null;

  if (indisponivelMotivo) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <GlassCard className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
            <PackageX className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Compra indisponível</h1>
          <p className="text-primary-500 font-medium mb-3">{material.titulo}</p>
          <p className="text-[var(--color-text-muted)] mb-6">{indisponivelMotivo}</p>
          <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-secondary)] mb-6">
            <p className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-primary-500" /> Dúvidas? Fale conosco:
            </p>
            <a href="mailto:contato@cursodeecocardiografia.com" className="text-primary-500 font-medium">
              contato@cursodeecocardiografia.com
            </a>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/materiais/${material._id}`}>
              <GlassButton variant="secondary" fullWidth leftIcon={<ArrowLeft className="w-4 h-4" />}>Voltar ao material</GlassButton>
            </Link>
            <Link to="/materiais">
              <GlassButton variant="primary" fullWidth>Ver outros materiais</GlassButton>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Compra sem login exige e-mail: é por ele que o convidado recebe o código de
  // acesso, o PDF e o comprovante. Com o SMTP desativado, pedimos login antes.
  if (!isAuthenticated && config?.compraSemLoginPermitida === false) {
    const voltarPara = `${location.pathname}${location.search}`;
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <GlassCard className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary-500/15 flex items-center justify-center mx-auto mb-5">
            <LogIn className="w-10 h-10 text-primary-500" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Entre na sua conta para continuar</h1>
          <p className="text-primary-500 font-medium mb-3">{material.titulo}</p>
          <p className="text-[var(--color-text-muted)] mb-6">
            No momento o envio de e-mails está desativado, então não conseguiríamos enviar
            seu <strong>código de acesso</strong>, o <strong>material em PDF</strong> nem o
            <strong> comprovante</strong> para quem compra sem conta. Fazendo login, o material
            é liberado <strong>automaticamente na sua conta</strong> assim que o pagamento for
            aprovado — sem depender de e-mail.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <GlassButton
              variant="primary"
              fullWidth
              leftIcon={<LogIn className="w-4 h-4" />}
              onClick={() => navigate('/login', { state: { from: { pathname: voltarPara } } })}
            >
              Fazer login
            </GlassButton>
            <GlassButton
              variant="secondary"
              fullWidth
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => navigate('/registro', { state: { from: { pathname: voltarPara } } })}
            >
              Criar conta
            </GlassButton>
          </div>

          <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-secondary)]">
            <p className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-primary-500" /> Precisa de ajuda? Fale conosco:
            </p>
            <a href="mailto:contato@cursodeecocardiografia.com" className="text-primary-500 font-medium">
              contato@cursodeecocardiografia.com
            </a>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Total 0 = adesão gratuita: sem gateway, sem etapa de pagamento.
  const gratuito = valores ? isGratuito(valores.total) : isGratuito(material.preco);
  const vendasIndisponiveis = gratuito
    ? !(config?.adesaoGratuitaAtiva ?? config?.vendasAtivas)
    : !config?.vendasAtivas;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to={`/materiais/${material._id}`} className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-primary-500 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar ao material
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <GlassCard className="p-6">
            {!checkoutData ? (
            <>
            <h1 className="text-2xl font-heading font-bold mb-1 flex items-center gap-2">
              {gratuito
                ? <><Gift className="w-6 h-6 text-emerald-500" /> Obter Material Gratuito</>
                : <><ShoppingCart className="w-6 h-6 text-primary-500" /> Finalizar Compra</>}
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm mb-6">
              {gratuito
                ? 'Este material é gratuito. Confirme seus dados e o acesso é liberado na hora — sem pagamento.'
                : isAuthenticated
                  ? 'O material será liberado automaticamente na sua conta após o pagamento.'
                  : 'Você pode comprar sem login — enviaremos o acesso, o código e o comprovante para o seu e-mail.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <GlassInput label="Nome completo *" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassInput label="E-mail *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required />
                <GlassInput label="Telefone *" value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} placeholder="(21) 99999-9999" required />
              </div>
              <GlassInput
                label="CPF *"
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                error={cpf && !cpfValido ? 'CPF inválido' : undefined}
                required
              />

              <div>
                <label className="label">Cupom de desconto</label>
                <div className="flex gap-2">
                  <GlassInput
                    value={cupom}
                    onChange={(e) => setCupom(e.target.value.toUpperCase())}
                    placeholder="Digite o código"
                    leftIcon={<Tag className="w-4 h-4" />}
                    disabled={!!cupomAplicado}
                  />
                  {cupomAplicado ? (
                    <GlassButton type="button" variant="secondary" onClick={handleRemoverCupom}>Remover</GlassButton>
                  ) : (
                    <GlassButton type="button" variant="secondary" onClick={handleAplicarCupom}>Aplicar</GlassButton>
                  )}
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] cursor-pointer">
                <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1 w-5 h-5 accent-primary-500 flex-shrink-0" />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Li e aceito os{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-primary-500 underline font-medium">
                    Termos e Condições de Compra
                  </button>
                  , a Política de Privacidade e autorizo o acesso imediato ao conteúdo digital.
                </span>
              </label>

              <GlassButton
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                isLoading={submitting}
                disabled={submitting || vendasIndisponiveis || !aceite}
                leftIcon={gratuito ? <Gift className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              >
                {vendasIndisponiveis
                  ? 'Indisponível no momento'
                  : gratuito
                    ? 'Liberar meu acesso gratuito'
                    : `Pagar ${valores ? brl(valores.total) : ''}`}
              </GlassButton>

              <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {gratuito
                  ? 'Nenhuma cobrança será feita — material 100% gratuito'
                  : 'Pagamento processado com segurança pelo Mercado Pago'}
              </div>
            </form>
            </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
                    <Lock className="w-6 h-6 text-primary-500" /> Pagamento
                  </h1>
                  <button
                    type="button"
                    onClick={() => setCheckoutData(null)}
                    className="text-sm text-[var(--color-text-muted)] hover:text-primary-500 transition-colors"
                  >
                    Editar dados
                  </button>
                </div>
                <p className="text-[var(--color-text-muted)] text-sm">
                  Escolha a forma de pagamento e conclua sua compra com segurança, sem sair da plataforma.
                </p>
                <MercadoPagoBrick
                  publicKey={checkoutData.publicKey}
                  amount={checkoutData.amount}
                  payer={{
                    email: checkoutData.payer.email,
                    firstName: checkoutData.payer.firstName,
                    lastName: checkoutData.payer.lastName,
                    cpf: checkoutData.payer.cpf
                  }}
                  metodos={checkoutData.metodos}
                  parcelasMaximas={checkoutData.parcelasMaximas}
                  onPay={handlePay}
                />
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Seus dados de pagamento são protegidos e processados pelo Mercado Pago
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        <div className="lg:col-span-2">
          <GlassCard className="p-6 lg:sticky lg:top-6">
            <h2 className="font-heading font-bold text-lg mb-4">Resumo do pedido</h2>
            {material.capa && <img src={material.capa} alt={material.titulo} className="w-full h-32 object-cover rounded-xl mb-4" />}
            <h3 className="font-semibold mb-3">{material.titulo}</h3>

            {valores && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Preço do material</span>
                  <span>{brl(valores.precoBase)}</span>
                </div>
                {valores.descontoAtivado > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Desconto promocional</span>
                    <span>- {brl(valores.descontoAtivado)}</span>
                  </div>
                )}
                {valores.descontoCupom > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Cupom {cupomAplicado}</span>
                    <span>- {brl(valores.descontoCupom)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[var(--glass-border)]">
                  <span className="text-[var(--color-text-muted)]">Subtotal</span>
                  <span>{brl(valores.subtotal)}</span>
                </div>
                {valores.taxaOperacional > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Taxa operacional ({valores.taxaOperacionalPercentual}%)</span>
                    <span>{brl(valores.taxaOperacional)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 mt-1 border-t border-[var(--glass-border)] text-lg font-bold">
                  <span>Total</span>
                  <span className={gratuito ? 'text-emerald-500' : 'text-primary-500'}>{formatPreco(valores.total)}</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {gratuito ? 'Acesso liberado imediatamente' : 'Acesso liberado após confirmação do pagamento'}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Desafio 3-D Secure do emissor (cartão de débito/crédito) */}
      {threeDs && checkoutData && (
        <ThreeDSChallenge
          challenge={threeDs}
          checkStatus={checkOrderStatus}
          onResolved={() => {
            setThreeDs(null);
            navigate(`/materiais/compra/status?pedido=${checkoutData.numeroPedido}`);
          }}
          onCancel={() => {
            setThreeDs(null);
            toast('Verificação não concluída. Veja o status do pedido para tentar novamente.');
            navigate(`/materiais/compra/status?pedido=${checkoutData.numeroPedido}`);
          }}
        />
      )}

      <GlassModal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Termos e Condições de Compra" size="lg">
        <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {config?.termosCompra || 'Termos indisponíveis.'}
        </div>
        <div className="mt-4 flex justify-end">
          <GlassButton variant="primary" onClick={() => { setAceite(true); setShowTerms(false); }}>Li e aceito</GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default MaterialCheckout;

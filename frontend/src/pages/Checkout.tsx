import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingCart, Tag, ShieldCheck, Loader2, ArrowLeft, CheckCircle2, Lock, Calendar, Clock, PackageX, Mail
} from 'lucide-react';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '../components/ui';
import MercadoPagoBrick from '../components/MercadoPagoBrick';
import { courseService, paymentService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Course, OrderValores, PaymentConfig } from '../types';

interface CheckoutData {
  numeroPedido: string;
  publicKey: string;
  amount: number;
  payer: { nome: string; email: string; firstName: string; lastName: string; cpf: string };
  metodos: { pix: boolean; cartaoCredito: boolean; cartaoDebito: boolean; boleto: boolean };
  parcelasMaximas: number;
}

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const maskCPF = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const maskPhone = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');

const Checkout: React.FC = () => {
  const { cursoId } = useParams<{ cursoId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [valores, setValores] = useState<OrderValores | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);

  // Form
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cupom, setCupom] = useState('');
  const [cupomAplicado, setCupomAplicado] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loteNome, setLoteNome] = useState<string | null>(null);
  const [indisponivelMotivo, setIndisponivelMotivo] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setNome(user.nomeCompleto || '');
      setEmail(user.email || '');
      if (user.cpf) setCpf(maskCPF(user.cpf));
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      if (!cursoId) return;
      setLoading(true);
      try {
        const [courseRes, configRes] = await Promise.all([
          courseService.getById(cursoId),
          paymentService.getConfig()
        ]);
        const c: Course = courseRes.data.course || courseRes.data;
        setCourse(c);
        setConfig(configRes.data);

        // Determina indisponibilidade ANTES de exibir o formulário
        if (!configRes.data.vendasAtivas) {
          setIndisponivelMotivo('As vendas estão temporariamente indisponíveis. Por favor, tente novamente mais tarde.');
          return;
        }
        if (!c.venda?.disponivel || !((c.venda?.preco || 0) > 0)) {
          setIndisponivelMotivo('Este curso não está disponível para compra online no momento.');
          return;
        }

        await refreshQuote(cursoId, undefined, user?.email);
      } catch (err: any) {
        console.error(err);
        if (err.response?.status === 404) {
          toast.error('Curso não encontrado');
          navigate('/cursos');
        } else {
          setIndisponivelMotivo('Não foi possível carregar este curso para compra no momento.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoId]);

  const refreshQuote = async (id: string, cupomCode?: string, emailForQuote?: string) => {
    try {
      const res = await paymentService.quote({ cursoId: id, cupom: cupomCode, email: emailForQuote });
      setValores(res.data.valores);
      setLoteNome(res.data.lote?.nome || null);
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

  const handleAplicarCupom = async () => {
    if (!cursoId || !cupom.trim()) return;
    await refreshQuote(cursoId, cupom.trim(), email);
  };

  const handleRemoverCupom = async () => {
    if (!cursoId) return;
    setCupom('');
    setCupomAplicado(null);
    await refreshQuote(cursoId, undefined, email);
  };

  const cpfValido = useMemo(() => cpf.replace(/\D/g, '').length === 11, [cpf]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoId) return;
    if (nome.trim().length < 3) return toast.error('Informe seu nome completo');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('E-mail inválido');
    if (telefone.replace(/\D/g, '').length < 10) return toast.error('Telefone inválido');
    if (!cpfValido) return toast.error('CPF inválido');
    if (!aceite) return toast.error('É necessário aceitar os Termos e Condições de Compra');

    setSubmitting(true);
    try {
      const res = await paymentService.checkout({
        cursoId,
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
        toast.success('Compra concluída!');
        navigate(`/compra/status?pedido=${data.numeroPedido}`);
        return;
      }
      // Checkout Transparente: avança para a etapa de pagamento (Payment Brick)
      setCheckoutData(data);
      setSubmitting(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível iniciar o pagamento');
      setSubmitting(false);
    }
  };

  const handlePay = async (formData: any): Promise<{ ok: boolean; message?: string }> => {
    if (!checkoutData?.numeroPedido) return { ok: false };
    try {
      const res = await paymentService.process(checkoutData.numeroPedido, formData);
      const d = res.data;
      if (d.status === 'aprovado' || d.status === 'em_processo' || d.status === 'pendente') {
        navigate(`/compra/status?pedido=${checkoutData.numeroPedido}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!course) return null;

  // Tela bonita de indisponibilidade (bloqueia o formulário)
  if (indisponivelMotivo) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <GlassCard className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
            <PackageX className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Compra indisponível</h1>
          {course?.titulo && (
            <p className="text-primary-500 font-medium mb-3">{course.titulo}</p>
          )}
          <p className="text-[var(--color-text-muted)] mb-6">{indisponivelMotivo}</p>

          <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-secondary)] mb-6">
            <p className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-primary-500" />
              Dúvidas? Fale com nossa equipe:
            </p>
            <a href="mailto:contato@cursodeecocardiografia.com" className="text-primary-500 font-medium">
              contato@cursodeecocardiografia.com
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/cursos/${course._id}`}>
              <GlassButton variant="secondary" fullWidth leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Voltar ao curso
              </GlassButton>
            </Link>
            <Link to="/cursos">
              <GlassButton variant="primary" fullWidth>Ver outros cursos</GlassButton>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const vendasIndisponiveis = !config?.vendasAtivas;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to={`/cursos/${course._id}`} className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-primary-500 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar ao curso
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-3 space-y-6">
          <GlassCard className="p-6">
            {!checkoutData ? (
            <>
            <h1 className="text-2xl font-heading font-bold mb-1 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary-500" /> Finalizar Compra
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm mb-6">
              {isAuthenticated
                ? 'O acesso será liberado automaticamente na sua conta após o pagamento.'
                : 'Você pode comprar sem login — enviaremos a chave de ativação e o comprovante para o seu e-mail.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <GlassInput
                label="Nome completo *"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassInput
                  label="E-mail *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                />
                <GlassInput
                  label="Telefone *"
                  value={telefone}
                  onChange={(e) => setTelefone(maskPhone(e.target.value))}
                  placeholder="(21) 99999-9999"
                  required
                />
              </div>
              <GlassInput
                label="CPF *"
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                error={cpf && !cpfValido ? 'CPF inválido' : undefined}
                required
              />

              {/* Cupom */}
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
                    <GlassButton type="button" variant="secondary" onClick={handleRemoverCupom}>
                      Remover
                    </GlassButton>
                  ) : (
                    <GlassButton type="button" variant="secondary" onClick={handleAplicarCupom}>
                      Aplicar
                    </GlassButton>
                  )}
                </div>
              </div>

              {/* Aceite de termos */}
              <label className="flex items-start gap-3 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceite}
                  onChange={(e) => setAceite(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-primary-500 flex-shrink-0"
                />
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
                leftIcon={<Lock className="w-5 h-5" />}
              >
                {vendasIndisponiveis ? 'Vendas indisponíveis' : `Pagar ${valores ? brl(valores.total) : ''}`}
              </GlassButton>

              <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Pagamento processado com segurança pelo Mercado Pago
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

        {/* Resumo */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 lg:sticky lg:top-6">
            <h2 className="font-heading font-bold text-lg mb-4">Resumo do pedido</h2>

            {course.imagemCapa && (
              <img src={course.imagemCapa} alt={course.titulo} className="w-full h-32 object-cover rounded-xl mb-4" />
            )}
            <h3 className="font-semibold mb-3">{course.titulo}</h3>

            {/* Janela de acesso do curso */}
            <div className="mb-4 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <Calendar className="w-3.5 h-3.5 text-primary-500" />
                <span>Início em {new Date(course.dataInicio).toLocaleDateString('pt-BR')}</span>
              </div>
              {course.dataTermino && (
                course.expirado ? (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-2.5 text-red-700 dark:text-red-400">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Curso encerrado em {new Date(course.dataTermino).toLocaleDateString('pt-BR')}.</strong>{' '}
                      Este curso atingiu a data de término e o acesso ao conteúdo não está mais disponível.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2.5 text-amber-700 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Acesso disponível até {new Date(course.dataTermino).toLocaleDateString('pt-BR')}.</strong>{' '}
                      Após a data de término, o conteúdo do curso é encerrado e o acesso é interrompido.
                    </span>
                  </div>
                )
              )}
            </div>

            {valores && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Preço do curso</span>
                  <span>{brl(valores.precoBase)}</span>
                </div>
                {valores.descontoLote > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Desconto {loteNome ? `(${loteNome})` : '(lote)'}</span>
                    <span>- {brl(valores.descontoLote)}</span>
                  </div>
                )}
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
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">
                    Taxa operacional ({valores.taxaOperacionalPercentual}%)
                  </span>
                  <span>{brl(valores.taxaOperacional)}</span>
                </div>
                <div className="flex justify-between pt-3 mt-1 border-t border-[var(--glass-border)] text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary-500">{brl(valores.total)}</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Acesso liberado após confirmação do pagamento
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Modal de Termos */}
      <GlassModal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Termos e Condições de Compra" size="lg">
        <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {config?.termosCompra || 'Termos indisponíveis.'}
        </div>
        <div className="mt-4 flex justify-end">
          <GlassButton variant="primary" onClick={() => { setAceite(true); setShowTerms(false); }}>
            Li e aceito
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default Checkout;

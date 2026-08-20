import React, { useEffect, useState } from 'react';
import {
  ShoppingBag, Tag, Layers, Settings as SettingsIcon, DollarSign,
  Search, RefreshCw, Loader2, Trash2, Plus, Eye, CheckCircle2,
  BookOpen, Package, AlertTriangle, TrendingUp, RefreshCcwDot
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  GlassCard, GlassButton, GlassInput, GlassSelect, GlassTabs, GlassBadge, GlassModal, GlassTextarea
} from '../../components/ui';
import {
  paymentService, materialService, couponService, priceLotService, courseService
} from '../../services/api';
import type { Coupon, PriceLot, Course, PaymentConfig } from '../../types';

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const statusBadge: Record<string, { variant: any; label: string }> = {
  aprovado: { variant: 'success', label: 'Aprovado' },
  pendente: { variant: 'warning', label: 'Pendente' },
  em_processo: { variant: 'warning', label: 'Em processo' },
  rejeitado: { variant: 'danger', label: 'Rejeitado' },
  cancelado: { variant: 'default', label: 'Cancelado' },
  reembolsado: { variant: 'default', label: 'Reembolsado' }
};

/* ========================= ABA: PEDIDOS (UNIFICADO cursos + materiais) ========================= */
const origemBadge = (origem: string) =>
  origem === 'material'
    ? <GlassBadge variant="primary"><span className="inline-flex items-center gap-1"><Package className="w-3 h-3" /> Material</span></GlassBadge>
    : <GlassBadge variant="default"><span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> Curso</span></GlassBadge>;

const OrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [origem, setOrigem] = useState<'' | 'curso' | 'material'>('');
  const [detail, setDetail] = useState<any>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ordersRes, statsRes] = await Promise.all([
        paymentService.admin.getUnifiedOrders({
          search: search || undefined,
          status: status || undefined,
          origem: origem || undefined
        }),
        paymentService.admin.getUnifiedStats()
      ]);
      setOrders(ordersRes.data.orders);
      setStats(statsRes.data);
    } catch {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, origem]);

  const openDetail = async (o: any) => {
    try {
      const res = o.origem === 'material'
        ? await materialService.admin.getOrderById(o._id)
        : await paymentService.admin.getOrderById(o._id);
      setDetail({ ...res.data, origem: o.origem });
    } catch {
      toast.error('Erro ao carregar pedido');
    }
  };

  const refulfill = async () => {
    if (!detail) return;
    setReprocessing(true);
    try {
      if (detail.origem === 'material') await materialService.admin.refulfill(detail._id);
      else await paymentService.admin.refulfill(detail._id);
      toast.success('Pedido reprocessado / e-mail reenviado');
      await openDetail({ _id: detail._id, origem: detail.origem });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao reprocessar');
    } finally {
      setReprocessing(false);
    }
  };

  /**
   * Reconsulta o Mercado Pago para TODOS os pedidos pendentes e aprova os que
   * já foram pagos (quando o webhook não chegou). O cron externo faz isso
   * sozinho de tempos em tempos — este botão é o disparo manual.
   */
  const reconcile = async () => {
    setSyncing(true);
    try {
      const res = await paymentService.admin.reconcile();
      const { pedidosVerificados, pedidosAtualizados, pedidosAprovados, entregasReprocessadas } = res.data;
      if (pedidosAtualizados || entregasReprocessadas) {
        toast.success(
          `${pedidosAtualizados} pedido(s) atualizado(s) · ${pedidosAprovados} aprovado(s) · ${entregasReprocessadas} entrega(s) reprocessada(s)`
        );
      } else {
        toast.success(`Nenhuma mudança: ${pedidosVerificados} pedido(s) pendente(s) continuam sem pagamento confirmado.`);
      }
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao sincronizar pagamentos');
    } finally {
      setSyncing(false);
    }
  };

  const produtoTitulo = detail ? (detail.produtoTitulo || detail.cursoTitulo || detail.materialTitulo || '-') : '';

  return (
    <div className="space-y-4">
      {/* Receita total consolidada (cursos + materiais) */}
      {stats && (
        <>
          <GlassCard className="p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Receita total (cursos + materiais)</p>
                <p className="text-3xl font-bold text-emerald-500">{brl(stats.receitaTotal)}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Ticket médio {brl(stats.ticketMedio)} · Taxa operacional arrecadada {brl(stats.taxaArrecadadaTotal)}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-center min-w-[120px]">
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Cursos</p>
                  <p className="text-lg font-bold">{brl(stats.receitaCursos)}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{stats.cursos?.aprovados || 0} vendas</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-center min-w-[120px]">
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1"><Package className="w-3.5 h-3.5" /> Materiais</p>
                  <p className="text-lg font-bold">{brl(stats.receitaMateriais)}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{stats.materiais?.aprovados || 0} vendas</p>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <GlassCard className="p-4"><p className="text-xs text-[var(--color-text-muted)]">Pedidos</p><p className="text-xl font-bold">{stats.totalPedidos}</p></GlassCard>
            <GlassCard className="p-4"><p className="text-xs text-[var(--color-text-muted)]">Aprovados</p><p className="text-xl font-bold text-emerald-500">{stats.aprovados}</p></GlassCard>
            <GlassCard className="p-4"><p className="text-xs text-[var(--color-text-muted)]">Pendentes</p><p className="text-xl font-bold text-amber-500">{stats.pendentes}</p></GlassCard>
            <GlassCard className="p-4"><p className="text-xs text-[var(--color-text-muted)]">Rejeitados</p><p className="text-xl font-bold text-red-500">{stats.rejeitados}</p></GlassCard>
          </div>

          {stats.emailsFalhos > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{stats.emailsFalhos}</strong> compra(s) de material entregues com e-mail não enviado. O acesso do comprador está garantido; use "Reprocessar" no pedido para reenviar.</span>
            </div>
          )}
        </>
      )}

      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 flex gap-2">
            <GlassInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Buscar por pedido, nome ou e-mail"
              leftIcon={<Search className="w-4 h-4" />}
            />
            <GlassButton variant="secondary" onClick={load}>Buscar</GlassButton>
          </div>
          <GlassSelect
            value={origem}
            onChange={(e) => setOrigem(e.target.value as any)}
            options={[
              { value: '', label: 'Todas as origens' },
              { value: 'curso', label: 'Cursos' },
              { value: 'material', label: 'Materiais' }
            ]}
          />
          <GlassSelect
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'Todos os status' },
              { value: 'aprovado', label: 'Aprovados' },
              { value: 'pendente', label: 'Pendentes' },
              { value: 'em_processo', label: 'Em processo' },
              { value: 'rejeitado', label: 'Rejeitados' },
              { value: 'cancelado', label: 'Cancelados' }
            ]}
          />
          <GlassButton variant="secondary" onClick={load} leftIcon={<RefreshCw className="w-4 h-4" />}>Atualizar</GlassButton>
          <GlassButton
            variant="primary"
            onClick={reconcile}
            disabled={syncing}
            leftIcon={syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcwDot className="w-4 h-4" />}
            title="Reconsulta o Mercado Pago e aprova os pedidos que já foram pagos"
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar pendentes'}
          </GlassButton>
        </div>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto" /></div>
        ) : orders.length === 0 ? (
          <p className="py-12 text-center text-[var(--color-text-muted)]">Nenhum pedido encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--glass-border)]">
                  <th className="py-2 px-2">Pedido</th>
                  <th className="py-2 px-2">Origem</th>
                  <th className="py-2 px-2">Comprador</th>
                  <th className="py-2 px-2">Produto</th>
                  <th className="py-2 px-2">Total</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Data</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-[var(--glass-border)]/50 hover:bg-[var(--glass-bg)]">
                    <td className="py-2 px-2 font-mono text-xs">{o.numeroPedido}</td>
                    <td className="py-2 px-2">{origemBadge(o.origem)}</td>
                    <td className="py-2 px-2">
                      <div>{o.compradorDados.nome}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{o.compradorDados.email}</div>
                    </td>
                    <td className="py-2 px-2">{o.produtoTitulo}</td>
                    <td className="py-2 px-2 font-semibold">{brl(o.valores.total)}</td>
                    <td className="py-2 px-2"><GlassBadge variant={statusBadge[o.status]?.variant}>{statusBadge[o.status]?.label || o.status}</GlassBadge></td>
                    <td className="py-2 px-2 text-xs">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2 px-2">
                      <GlassButton size="sm" variant="secondary" onClick={() => openDetail(o)} leftIcon={<Eye className="w-4 h-4" />}>Ver</GlassButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <GlassModal isOpen={!!detail} onClose={() => setDetail(null)} title={`Pedido ${detail?.numeroPedido || ''}`} size="lg">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {origemBadge(detail.origem)}
              <GlassBadge variant={statusBadge[detail.status]?.variant}>{statusBadge[detail.status]?.label || detail.status}</GlassBadge>
              {detail.entregue && <GlassBadge variant="success">Entregue</GlassBadge>}
              {detail.emailEnviado
                ? <GlassBadge variant="default">E-mail enviado</GlassBadge>
                : <GlassBadge variant="warning">E-mail não enviado</GlassBadge>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[var(--color-text-muted)]">Comprador</p><p>{detail.compradorDados.nome}</p></div>
              <div><p className="text-[var(--color-text-muted)]">E-mail</p><p>{detail.compradorDados.email}</p></div>
              <div><p className="text-[var(--color-text-muted)]">Telefone</p><p>{detail.compradorDados.telefone}</p></div>
              <div><p className="text-[var(--color-text-muted)]">CPF</p><p>{detail.compradorDados.cpf}</p></div>
              <div><p className="text-[var(--color-text-muted)]">{detail.origem === 'material' ? 'Material' : 'Curso'}</p><p>{produtoTitulo}</p></div>
              <div><p className="text-[var(--color-text-muted)]">Método</p><p>{detail.metodoPagamento || '-'}</p></div>
              <div><p className="text-[var(--color-text-muted)]">Serial Key</p><p className="font-mono">{detail.serialKeyCodigo || '-'}</p></div>
              <div><p className="text-[var(--color-text-muted)]">Payment ID (MP)</p><p className="font-mono text-xs">{detail.mercadoPago?.paymentId || '-'}</p></div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <div className="flex justify-between"><span>Preço base</span><span>{brl(detail.valores.precoBase)}</span></div>
              {detail.valores.descontoLote > 0 && <div className="flex justify-between text-emerald-500"><span>Desconto lote</span><span>- {brl(detail.valores.descontoLote)}</span></div>}
              {detail.valores.descontoAtivado > 0 && <div className="flex justify-between text-emerald-500"><span>Desconto promocional</span><span>- {brl(detail.valores.descontoAtivado)}</span></div>}
              {detail.valores.descontoCupom > 0 && <div className="flex justify-between text-emerald-500"><span>Cupom {detail.cupomAplicado?.codigo}</span><span>- {brl(detail.valores.descontoCupom)}</span></div>}
              <div className="flex justify-between"><span>Subtotal</span><span>{brl(detail.valores.subtotal)}</span></div>
              <div className="flex justify-between"><span>Taxa operacional ({detail.valores.taxaOperacionalPercentual}%)</span><span>{brl(detail.valores.taxaOperacional)}</span></div>
              <div className="flex justify-between font-bold pt-1 border-t border-[var(--glass-border)] mt-1"><span>Total</span><span>{brl(detail.valores.total)}</span></div>
            </div>
            {detail.aceiteTermos?.aceito && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Termos aceitos (v{detail.aceiteTermos.versao}) em {new Date(detail.aceiteTermos.dataAceite).toLocaleString('pt-BR')} · IP {detail.aceiteTermos.ip}
              </p>
            )}
            {detail.status === 'aprovado' && (
              <GlassButton variant="secondary" onClick={refulfill} isLoading={reprocessing} disabled={reprocessing} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Reprocessar entrega / reenviar e-mail
              </GlassButton>
            )}
          </div>
        )}
      </GlassModal>
    </div>
  );
};

/* ========================= ABA: PREÇOS DOS CURSOS ========================= */
const PricingTab: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await paymentService.admin.getCoursesPricing();
      setCourses(res.data.courses);
    } catch { toast.error('Erro ao carregar cursos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await paymentService.admin.updateCoursePricing(editing._id, {
        disponivel: editing.venda.disponivel,
        preco: Number(editing.venda.preco),
        validadeAcessoDias: Number(editing.venda.validadeAcessoDias),
        descontoAtivado: {
          ativo: editing.venda.descontoAtivado.ativo,
          tipo: editing.venda.descontoAtivado.tipo,
          valor: Number(editing.venda.descontoAtivado.valor)
        }
      });
      toast.success('Configuração de venda salva');
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erro ao salvar'); }
  };

  const openEdit = (c: any) => {
    setEditing({
      ...c,
      venda: c.venda || { disponivel: false, preco: 0, validadeAcessoDias: 365, descontoAtivado: { ativo: false, tipo: 'percentual', valor: 0 } }
    });
  };

  if (loading) return <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto" /></div>;

  return (
    <div className="space-y-3">
      {courses.map((c) => (
        <GlassCard key={c._id} className="p-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{c.titulo}</p>
            <div className="flex items-center gap-2 mt-1 text-sm">
              {c.venda?.disponivel ? <GlassBadge variant="success">À venda</GlassBadge> : <GlassBadge variant="default">Não à venda</GlassBadge>}
              <span className="text-[var(--color-text-muted)]">{brl(c.venda?.preco || 0)}</span>
              {c.venda?.descontoAtivado?.ativo && <GlassBadge variant="warning">Desconto ativo</GlassBadge>}
            </div>
          </div>
          <GlassButton size="sm" variant="secondary" onClick={() => openEdit(c)}>Configurar</GlassButton>
        </GlassCard>
      ))}

      <GlassModal isOpen={!!editing} onClose={() => setEditing(null)} title={`Venda — ${editing?.titulo || ''}`} size="md">
        {editing && (
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-primary-500" checked={editing.venda.disponivel}
                onChange={(e) => setEditing({ ...editing, venda: { ...editing.venda, disponivel: e.target.checked } })} />
              <span>Disponível para compra</span>
            </label>
            <GlassInput label="Preço (R$)" type="number" step="0.01" min="0" value={editing.venda.preco}
              onChange={(e) => setEditing({ ...editing, venda: { ...editing.venda, preco: e.target.value } })} />
            <GlassInput label="Validade do acesso (dias, 0 = sem expiração)" type="number" min="0" value={editing.venda.validadeAcessoDias}
              onChange={(e) => setEditing({ ...editing, venda: { ...editing.venda, validadeAcessoDias: e.target.value } })} />

            <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-primary-500" checked={editing.venda.descontoAtivado.ativo}
                  onChange={(e) => setEditing({ ...editing, venda: { ...editing.venda, descontoAtivado: { ...editing.venda.descontoAtivado, ativo: e.target.checked } } })} />
                <span className="font-medium">Desconto ativado</span>
              </label>
              {editing.venda.descontoAtivado.ativo && (
                <div className="grid grid-cols-2 gap-3">
                  <GlassSelect label="Tipo" value={editing.venda.descontoAtivado.tipo}
                    onChange={(e) => setEditing({ ...editing, venda: { ...editing.venda, descontoAtivado: { ...editing.venda.descontoAtivado, tipo: e.target.value } } })}
                    options={[{ value: 'percentual', label: 'Percentual (%)' }, { value: 'fixo', label: 'Valor fixo (R$)' }]} />
                  <GlassInput label="Valor" type="number" min="0" step="0.01" value={editing.venda.descontoAtivado.valor}
                    onChange={(e) => setEditing({ ...editing, venda: { ...editing.venda, descontoAtivado: { ...editing.venda.descontoAtivado, valor: e.target.value } } })} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <GlassButton variant="secondary" onClick={() => setEditing(null)}>Cancelar</GlassButton>
              <GlassButton variant="primary" onClick={save}>Salvar</GlassButton>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
};

/* ========================= ABA: CUPONS ========================= */
const emptyCoupon = {
  codigo: '', descricao: '', tipo: 'percentual', valor: 10, ativo: true,
  dataValidade: '', usosMaximos: 0, usosPorEmail: 1, valorMinimoCompra: 0, cursosAplicaveis: [] as string[]
};

const CouponsTab: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, coursesRes] = await Promise.all([couponService.getAll(), courseService.getAll({ limit: 100 } as any)]);
      setCoupons(cRes.data.coupons);
      setCourses(coursesRes.data.courses || coursesRes.data);
    } catch { toast.error('Erro ao carregar cupons'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const payload = {
        ...form,
        valor: Number(form.valor),
        usosMaximos: Number(form.usosMaximos),
        usosPorEmail: Number(form.usosPorEmail),
        valorMinimoCompra: Number(form.valorMinimoCompra),
        dataValidade: form.dataValidade || undefined
      };
      if (form._id) await couponService.update(form._id, payload);
      else await couponService.create(payload);
      toast.success('Cupom salvo');
      setForm(null);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erro ao salvar cupom'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Deletar este cupom?')) return;
    try { await couponService.delete(id); toast.success('Cupom deletado'); load(); }
    catch { toast.error('Erro ao deletar'); }
  };

  if (loading) return <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GlassButton variant="primary" onClick={() => setForm({ ...emptyCoupon })} leftIcon={<Plus className="w-4 h-4" />}>Novo cupom</GlassButton>
      </div>
      {coupons.length === 0 ? (
        <p className="py-8 text-center text-[var(--color-text-muted)]">Nenhum cupom criado.</p>
      ) : coupons.map((c) => (
        <GlassCard key={c._id} className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <code className="font-mono font-bold text-primary-500">{c.codigo}</code>
              {c.ativo ? <GlassBadge variant="success">Ativo</GlassBadge> : <GlassBadge variant="default">Inativo</GlassBadge>}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {c.tipo === 'percentual' ? `${c.valor}% de desconto` : `${brl(c.valor)} de desconto`}
              {' · '}usos: {c.usosAtuais}{c.usosMaximos > 0 ? `/${c.usosMaximos}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <GlassButton size="sm" variant="secondary" onClick={() => setForm({ ...c, cursosAplicaveis: (c.cursosAplicaveis || []).map((x: any) => typeof x === 'string' ? x : x._id), dataValidade: c.dataValidade ? c.dataValidade.substring(0, 10) : '' })}>Editar</GlassButton>
            <GlassButton size="sm" variant="danger" onClick={() => remove(c._id)} leftIcon={<Trash2 className="w-4 h-4" />}>Deletar</GlassButton>
          </div>
        </GlassCard>
      ))}

      <GlassModal isOpen={!!form} onClose={() => setForm(null)} title={form?._id ? 'Editar cupom' : 'Novo cupom'} size="md">
        {form && (
          <div className="space-y-3">
            <GlassInput label="Código *" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="ECO10" />
            <GlassInput label="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <GlassSelect label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                options={[{ value: 'percentual', label: 'Percentual (%)' }, { value: 'fixo', label: 'Valor fixo (R$)' }]} />
              <GlassInput label="Valor" type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <GlassInput label="Usos máximos (0 = ilimitado)" type="number" min="0" value={form.usosMaximos} onChange={(e) => setForm({ ...form, usosMaximos: e.target.value })} />
              <GlassInput label="Usos por e-mail (0 = ilimitado)" type="number" min="0" value={form.usosPorEmail} onChange={(e) => setForm({ ...form, usosPorEmail: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <GlassInput label="Valor mínimo da compra" type="number" min="0" step="0.01" value={form.valorMinimoCompra} onChange={(e) => setForm({ ...form, valorMinimoCompra: e.target.value })} />
              <GlassInput label="Validade" type="date" value={form.dataValidade} onChange={(e) => setForm({ ...form, dataValidade: e.target.value })} />
            </div>
            <GlassSelect label="Curso específico (opcional, vazio = todos)" value={(form.cursosAplicaveis && form.cursosAplicaveis[0]) || ''}
              onChange={(e) => setForm({ ...form, cursosAplicaveis: e.target.value ? [e.target.value] : [] })}
              options={[{ value: '', label: 'Todos os cursos' }, ...courses.map((c) => ({ value: c._id, label: c.titulo }))]} />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-primary-500" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              <span>Cupom ativo</span>
            </label>
            <div className="flex justify-end gap-2">
              <GlassButton variant="secondary" onClick={() => setForm(null)}>Cancelar</GlassButton>
              <GlassButton variant="primary" onClick={save}>Salvar</GlassButton>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
};

/* ========================= ABA: LOTES ========================= */
const LotsTab: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [lots, setLots] = useState<PriceLot[]>([]);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    courseService.getAll({ limit: 100 } as any).then((r) => setCourses(r.data.courses || r.data)).catch(() => {});
  }, []);

  const loadLots = async (courseId: string) => {
    if (!courseId) { setLots([]); return; }
    try { const r = await priceLotService.getByCourse(courseId); setLots(r.data.lots); }
    catch { toast.error('Erro ao carregar lotes'); }
  };

  useEffect(() => { loadLots(selectedCourse); }, [selectedCourse]);

  const save = async () => {
    try {
      const payload = { ...form, curso: selectedCourse, preco: Number(form.preco), quantidadeTotal: Number(form.quantidadeTotal), ordem: Number(form.ordem) };
      if (form._id) await priceLotService.update(form._id, payload);
      else await priceLotService.create(payload);
      toast.success('Lote salvo');
      setForm(null);
      loadLots(selectedCourse);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erro ao salvar lote'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Deletar este lote?')) return;
    try { await priceLotService.delete(id); toast.success('Lote deletado'); loadLots(selectedCourse); }
    catch { toast.error('Erro ao deletar'); }
  };

  return (
    <div className="space-y-4">
      <GlassSelect label="Selecione o curso" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}
        options={[{ value: '', label: 'Escolha um curso...' }, ...courses.map((c) => ({ value: c._id, label: c.titulo }))]} />

      {selectedCourse && (
        <>
          <div className="flex justify-end">
            <GlassButton variant="primary" onClick={() => setForm({ nome: '', preco: 0, quantidadeTotal: 0, ordem: lots.length, ativo: true })} leftIcon={<Plus className="w-4 h-4" />}>Novo lote</GlassButton>
          </div>
          {lots.length === 0 ? (
            <p className="py-8 text-center text-[var(--color-text-muted)]">Nenhum lote para este curso.</p>
          ) : lots.map((l) => (
            <GlassCard key={l._id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{l.nome}</span>
                  {l.ativo ? <GlassBadge variant="success">Ativo</GlassBadge> : <GlassBadge variant="default">Inativo</GlassBadge>}
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {brl(l.preco)} · vendidos {l.quantidadeVendida}{l.quantidadeTotal > 0 ? `/${l.quantidadeTotal}` : ' (ilimitado)'} · ordem {l.ordem}
                </p>
              </div>
              <div className="flex gap-2">
                <GlassButton size="sm" variant="secondary" onClick={() => setForm({ ...l })}>Editar</GlassButton>
                <GlassButton size="sm" variant="danger" onClick={() => remove(l._id)} leftIcon={<Trash2 className="w-4 h-4" />}>Deletar</GlassButton>
              </div>
            </GlassCard>
          ))}
        </>
      )}

      <GlassModal isOpen={!!form} onClose={() => setForm(null)} title={form?._id ? 'Editar lote' : 'Novo lote'} size="md">
        {form && (
          <div className="space-y-3">
            <GlassInput label="Nome do lote *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Lote 1 - Primeiros 20" />
            <div className="grid grid-cols-2 gap-3">
              <GlassInput label="Preço (R$)" type="number" min="0" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
              <GlassInput label="Quantidade (0 = ilimitado)" type="number" min="0" value={form.quantidadeTotal} onChange={(e) => setForm({ ...form, quantidadeTotal: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <GlassInput label="Ordem" type="number" min="0" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} />
              {form._id !== undefined && (
                <GlassInput label="Qtd. vendida" type="number" min="0" value={form.quantidadeVendida ?? 0} onChange={(e) => setForm({ ...form, quantidadeVendida: e.target.value })} />
              )}
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-primary-500" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              <span>Lote ativo</span>
            </label>
            <div className="flex justify-end gap-2">
              <GlassButton variant="secondary" onClick={() => setForm(null)}>Cancelar</GlassButton>
              <GlassButton variant="primary" onClick={save}>Salvar</GlassButton>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
};

/* ========================= ABA: CONFIGURAÇÕES ========================= */
const SettingsTab: React.FC = () => {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const r = await paymentService.admin.getConfig(); setConfig(r.data); }
    catch { toast.error('Erro ao carregar configuração'); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await paymentService.admin.updateConfig(config);
      toast.success('Configuração salva');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const resetTerms = async () => {
    try { const r = await paymentService.admin.resetTerms(); setConfig(r.data); toast.success('Termos restaurados'); }
    catch { toast.error('Erro ao restaurar termos'); }
  };

  if (!config) return <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto" /></div>;

  const setMetodo = (k: keyof PaymentConfig['metodos'], v: boolean) =>
    setConfig({ ...config, metodos: { ...config.metodos, [k]: v } });

  return (
    <div className="space-y-4">
      {config.emailConfigurado === false && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 p-4 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Envio de e-mails desativado (SMTP não configurado)</p>
            <p>
              A <strong>compra sem login está bloqueada</strong>: sem e-mail não há como entregar
              a serial key, o material em PDF e o comprovante a quem compra como convidado.
              Visitantes deslogados são orientados a fazer login antes de comprar. Configure
              <code className="mx-1 px-1 rounded bg-black/5 dark:bg-white/10">SMTP_HOST</code>,
              <code className="mx-1 px-1 rounded bg-black/5 dark:bg-white/10">SMTP_USER</code> e
              <code className="mx-1 px-1 rounded bg-black/5 dark:bg-white/10">SMTP_PASS</code>
              no servidor para reativar a compra como convidado.
            </p>
          </div>
        </div>
      )}

      <GlassCard className="p-5 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-5 h-5 accent-primary-500" checked={config.vendasAtivas} onChange={(e) => setConfig({ ...config, vendasAtivas: e.target.checked })} />
          <span className="font-medium">Vendas ativas</span>
        </label>

        <GlassInput label="Taxa operacional (%)" type="number" min="0" step="0.01" value={config.taxaOperacionalPercentual}
          onChange={(e) => setConfig({ ...config, taxaOperacionalPercentual: Number(e.target.value) })}
          helperText="Somada ao valor do produto no checkout (padrão 1% - taxa Mercado Pago)" />

        <GlassInput label="Parcelas máximas (cartão)" type="number" min="1" max="24" value={config.parcelasMaximas}
          onChange={(e) => setConfig({ ...config, parcelasMaximas: Number(e.target.value) })} />

        <div>
          <p className="label mb-2">Métodos de pagamento aceitos</p>
          <div className="grid grid-cols-2 gap-2">
            {([['pix', 'Pix'], ['cartaoCredito', 'Cartão de crédito'], ['cartaoDebito', 'Cartão de débito'], ['boleto', 'Boleto']] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-primary-500" checked={config.metodos[k]} onChange={(e) => setMetodo(k, e.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="label">Termos e Condições de Compra</p>
          <div className="flex items-center gap-2">
            <GlassInput className="!w-24" label="" value={config.termosVersao} onChange={(e) => setConfig({ ...config, termosVersao: e.target.value })} placeholder="Versão" />
            <GlassButton size="sm" variant="secondary" onClick={resetTerms}>Restaurar padrão</GlassButton>
          </div>
        </div>
        <GlassTextarea rows={14} value={config.termosCompra} onChange={(e) => setConfig({ ...config, termosCompra: e.target.value })} />
      </GlassCard>

      <div className="flex justify-end">
        <GlassButton variant="primary" onClick={save} isLoading={saving} disabled={saving} leftIcon={<CheckCircle2 className="w-4 h-4" />}>Salvar configurações</GlassButton>
      </div>
    </div>
  );
};

/* ========================= PÁGINA ========================= */
const AdminPayments: React.FC = () => {
  const [tab, setTab] = useState('pedidos');

  const tabs = [
    { id: 'pedidos', label: 'Vendas', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'precos', label: 'Preços (cursos)', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'cupons', label: 'Cupons', icon: <Tag className="w-4 h-4" /> },
    { id: 'lotes', label: 'Lotes', icon: <Layers className="w-4 h-4" /> },
    { id: 'config', label: 'Configurações', icon: <SettingsIcon className="w-4 h-4" /> }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Pagamentos</h1>
        <p className="text-[var(--color-text-muted)] text-sm">Centro financeiro: todas as vendas (cursos + materiais), receita total, cupons, lotes e configurações.</p>
      </div>

      <GlassTabs tabs={tabs} activeTab={tab} onChange={setTab} className="overflow-x-auto" />

      {tab === 'pedidos' && <OrdersTab />}
      {tab === 'precos' && <PricingTab />}
      {tab === 'cupons' && <CouponsTab />}
      {tab === 'lotes' && <LotsTab />}
      {tab === 'config' && <SettingsTab />}
    </div>
  );
};

export default AdminPayments;

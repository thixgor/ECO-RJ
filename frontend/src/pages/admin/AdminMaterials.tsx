import React, { useEffect, useState } from 'react';
import {
  Package, Plus, Pencil, Trash2, Loader2, ShoppingBag, DollarSign, Star, AlertTriangle,
  RefreshCw, X, Eye, Video, FileText, File, Search, Info, Gift, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassButton, GlassInput, GlassTextarea, GlassSelect, GlassModal } from '../../components/ui';
import { materialService } from '../../services/api';
import type { MaterialAdmin, MaterialConteudo, MaterialOrder, ConteudoTipo, MaterialTipo } from '../../types';

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const emptyConteudo = (): MaterialConteudo => ({ tipo: 'pdf', titulo: '', descricao: '', arquivoUrl: '', nomeArquivo: '' });

const emptyForm = (): Partial<MaterialAdmin> => ({
  titulo: '', descricao: '', descricaoCurta: '', tipo: 'pdf', capa: '',
  conteudos: [], disponivel: true, ativo: true, destaque: false, ordem: 0,
  preco: 0, descontoAtivado: { ativo: false, tipo: 'percentual', valor: 0 }, validadeAcessoDias: 0
});

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    aprovado: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    pendente: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    em_processo: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    rejeitado: 'bg-red-500/15 text-red-600 dark:text-red-400',
    cancelado: 'bg-gray-500/15 text-gray-500',
    reembolsado: 'bg-purple-500/15 text-purple-500'
  };
  return map[status] || 'bg-gray-500/15 text-gray-500';
};

const AdminMaterials: React.FC = () => {
  const [tab, setTab] = useState<'materiais' | 'vendas'>('materiais');

  // Materiais
  const [materials, setMaterials] = useState<MaterialAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaterialAdmin | null>(null);
  const [form, setForm] = useState<Partial<MaterialAdmin>>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Conceder acesso
  const [grantFor, setGrantFor] = useState<MaterialAdmin | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [granting, setGranting] = useState(false);

  // Vendas
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [reprocessing, setReprocessing] = useState(false);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([
        materialService.admin.list(),
        materialService.admin.getStats().catch(() => null)
      ]);
      setMaterials(mRes.data.materials || []);
      if (sRes) setStats(sRes.data);
    } catch {
      toast.error('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await materialService.admin.getOrders({
        search: orderSearch || undefined,
        status: orderStatus || undefined,
        limit: 50
      });
      setOrders(res.data.orders || []);
    } catch {
      toast.error('Erro ao carregar vendas');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => { loadMaterials(); }, []);
  useEffect(() => { if (tab === 'vendas') loadOrders(); /* eslint-disable-next-line */ }, [tab]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (m: MaterialAdmin) => {
    setEditing(m);
    setForm({
      ...m,
      descontoAtivado: m.descontoAtivado || { ativo: false, tipo: 'percentual', valor: 0 },
      conteudos: (m.conteudos || []).map((c) => ({ ...c }))
    });
    setShowForm(true);
  };

  const setF = (patch: Partial<MaterialAdmin>) => setForm((f) => ({ ...f, ...patch }));

  const updateConteudo = (i: number, patch: Partial<MaterialConteudo>) => {
    setForm((f) => {
      const arr = [...(f.conteudos || [])];
      arr[i] = { ...arr[i], ...patch };
      return { ...f, conteudos: arr };
    });
  };
  const addConteudo = () => setForm((f) => ({ ...f, conteudos: [...(f.conteudos || []), emptyConteudo()] }));
  const removeConteudo = (i: number) => setForm((f) => ({ ...f, conteudos: (f.conteudos || []).filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.titulo?.trim()) return toast.error('Informe o título');
    if (!form.descricao?.trim()) return toast.error('Informe a descrição');
    setSaving(true);
    try {
      const payload = {
        ...form,
        preco: Number(form.preco) || 0,
        ordem: Number(form.ordem) || 0,
        validadeAcessoDias: Number(form.validadeAcessoDias) || 0
      };
      if (editing) {
        await materialService.admin.update(editing._id, payload);
        toast.success('Material atualizado');
      } else {
        await materialService.admin.create(payload);
        toast.success('Material criado');
      }
      setShowForm(false);
      await loadMaterials();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: MaterialAdmin) => {
    if (!window.confirm(`Excluir "${m.titulo}"? Se houver compras, o material será apenas desativado.`)) return;
    try {
      const res = await materialService.admin.delete(m._id);
      toast.success(res.data.message || 'Material removido');
      await loadMaterials();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao remover');
    }
  };

  const toggleField = async (m: MaterialAdmin, field: 'disponivel' | 'ativo' | 'destaque') => {
    try {
      await materialService.admin.update(m._id, { [field]: !m[field] });
      await loadMaterials();
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  const openDetail = async (id: string) => {
    try {
      const res = await materialService.admin.getOrderById(id);
      setOrderDetail(res.data);
    } catch {
      toast.error('Erro ao carregar pedido');
    }
  };

  const handleReprocess = async (id: string) => {
    setReprocessing(true);
    try {
      await materialService.admin.refulfill(id);
      toast.success('Pedido reprocessado e e-mail reenviado');
      await openDetail(id);
      await loadOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao reprocessar');
    } finally {
      setReprocessing(false);
    }
  };

  const handleGrant = async () => {
    if (!grantFor) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(grantEmail)) return toast.error('E-mail inválido');
    setGranting(true);
    try {
      const res = await materialService.admin.grant(grantFor._id, grantEmail.trim());
      toast.success('Acesso concedido');
      if (res.data.accessLink) {
        navigator.clipboard?.writeText(res.data.accessLink).catch(() => {});
        toast.success('Link de acesso copiado para a área de transferência');
      }
      setGrantFor(null);
      setGrantEmail('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao conceder acesso');
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-3">
          <Package className="w-8 h-8 text-primary-500" /> Materiais
        </h1>
        <p className="text-[var(--color-text-secondary)]">Gerencie os produtos da loja de materiais e acompanhe as vendas.</p>
      </div>

      {/* Aviso Vercel Blob */}
      <div className="mb-6 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-start gap-3 text-sm text-blue-800 dark:text-blue-300">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>
          Enquanto o <strong>Vercel Blob</strong> não é aplicado, cadastre os arquivos (PDF/arquivo) informando a
          <strong> URL direta</strong> do arquivo no campo correspondente. A migração para upload via Blob já está preparada no backend.
        </span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1"><ShoppingBag className="w-4 h-4" /> Vendas aprovadas</div>
            <p className="text-2xl font-bold">{stats.aprovados}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1"><DollarSign className="w-4 h-4" /> Receita total</div>
            <p className="text-2xl font-bold">{brl(stats.receitaTotal)}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1"><Package className="w-4 h-4" /> Materiais ativos</div>
            <p className="text-2xl font-bold">{stats.totalMateriais}</p>
          </GlassCard>
          <GlassCard className={`p-4 ${stats.emailsFalhos > 0 ? 'ring-2 ring-amber-500/50' : ''}`}>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1"><AlertTriangle className="w-4 h-4" /> E-mails não enviados</div>
            <p className={`text-2xl font-bold ${stats.emailsFalhos > 0 ? 'text-amber-500' : ''}`}>{stats.emailsFalhos}</p>
          </GlassCard>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--glass-border)]">
        <button onClick={() => setTab('materiais')} className={`px-5 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'materiais' ? 'border-primary-500 text-primary-500' : 'border-transparent text-[var(--color-text-muted)]'}`}>Materiais</button>
        <button onClick={() => setTab('vendas')} className={`px-5 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'vendas' ? 'border-primary-500 text-primary-500' : 'border-transparent text-[var(--color-text-muted)]'}`}>Vendas</button>
      </div>

      {tab === 'materiais' && (
        <>
          <div className="flex justify-end mb-4">
            <GlassButton variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>Novo material</GlassButton>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
          ) : materials.length === 0 ? (
            <GlassCard className="p-12 text-center text-[var(--color-text-muted)]">Nenhum material cadastrado ainda.</GlassCard>
          ) : (
            <div className="space-y-3">
              {materials.map((m) => (
                <GlassCard key={m._id} className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-14 h-14 rounded-lg bg-primary-500/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {m.capa ? <img src={m.capa} alt="" className="w-14 h-14 object-cover" /> : <Package className="w-6 h-6 text-primary-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{m.titulo}</h3>
                        {!m.ativo && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-500">Inativo</span>}
                        {m.destaque && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-500" /> Destaque</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mt-1 flex-wrap">
                        <span className="capitalize">{m.tipo}</span>
                        <span>{brl(m.preco)}</span>
                        <span>{m.conteudos?.length || 0} conteúdos</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {m.avaliacaoMedia?.toFixed(1) || '0.0'} ({m.avaliacaoTotal || 0})</span>
                        <span>{m.vendasTotais || 0} vendas</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => toggleField(m, 'disponivel')} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${m.disponivel ? 'bg-emerald-500/15 text-emerald-600' : 'bg-gray-500/15 text-gray-500'}`}>
                        {m.disponivel ? 'À venda' : 'Fora da loja'}
                      </button>
                      <button onClick={() => { setGrantFor(m); setGrantEmail(''); }} className="p-2 rounded-lg hover:bg-[var(--glass-bg)] text-emerald-500" title="Conceder acesso"><Gift className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(m)} className="p-2 rounded-lg hover:bg-[var(--glass-bg)] text-primary-500" title="Editar"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(m)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'vendas' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input className="input pl-9 w-full" placeholder="Buscar pedido, nome, e-mail, código..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadOrders()} />
            </div>
            <select className="input max-w-[180px]" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="aprovado">Aprovado</option>
              <option value="pendente">Pendente</option>
              <option value="em_processo">Em processo</option>
              <option value="rejeitado">Rejeitado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <GlassButton variant="secondary" onClick={loadOrders} leftIcon={<RefreshCw className="w-4 h-4" />}>Filtrar</GlassButton>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
          ) : orders.length === 0 ? (
            <GlassCard className="p-12 text-center text-[var(--color-text-muted)]">Nenhuma venda encontrada.</GlassCard>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <GlassCard key={o._id} className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-[var(--color-text-muted)]">{o.numeroPedido}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(o.status)}`}>{o.status}</span>
                        {o.status === 'aprovado' && !o.emailEnviado && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> e-mail não enviado</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate mt-0.5">{o.materialTitulo}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{o.compradorDados?.nome} · {o.compradorDados?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-500">{brl(o.valores?.total || 0)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <button onClick={() => openDetail(o._id)} className="p-2 rounded-lg hover:bg-[var(--glass-bg)] text-primary-500" title="Detalhes"><Eye className="w-4 h-4" /></button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal formulário material */}
      <GlassModal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar material' : 'Novo material'} size="full">
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
          <GlassInput label="Título *" value={form.titulo || ''} onChange={(e) => setF({ titulo: e.target.value })} />
          <GlassTextarea label="Descrição *" rows={4} value={form.descricao || ''} onChange={(e) => setF({ descricao: e.target.value })} />
          <GlassInput label="Descrição curta (card)" value={form.descricaoCurta || ''} onChange={(e) => setF({ descricaoCurta: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassSelect
              label="Tipo"
              value={form.tipo}
              onChange={(e) => setF({ tipo: e.target.value as MaterialTipo })}
              options={[
                { value: 'aula', label: 'Aulas' },
                { value: 'pdf', label: 'Material em PDF' },
                { value: 'arquivo', label: 'Arquivo' },
                { value: 'conjunto', label: 'Conjunto (misto)' }
              ]}
            />
            <GlassInput label="Capa (URL da imagem)" value={form.capa || ''} onChange={(e) => setF({ capa: e.target.value })} placeholder="https://i.imgur.com/..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassInput label="Preço (R$)" type="number" min={0} step="0.01" value={String(form.preco ?? 0)} onChange={(e) => setF({ preco: Number(e.target.value) })} />
            <GlassInput label="Validade do acesso (dias, 0 = vitalício)" type="number" min={0} value={String(form.validadeAcessoDias ?? 0)} onChange={(e) => setF({ validadeAcessoDias: Number(e.target.value) })} />
            <GlassInput label="Ordem" type="number" value={String(form.ordem ?? 0)} onChange={(e) => setF({ ordem: Number(e.target.value) })} />
          </div>

          {/* Desconto ativado */}
          <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
            <label className="flex items-center gap-2 mb-3 text-sm font-medium">
              <input type="checkbox" className="w-4 h-4 accent-primary-500" checked={!!form.descontoAtivado?.ativo} onChange={(e) => setF({ descontoAtivado: { ...(form.descontoAtivado as any), ativo: e.target.checked } })} />
              Desconto promocional ativado
            </label>
            {form.descontoAtivado?.ativo && (
              <div className="grid grid-cols-2 gap-3">
                <GlassSelect
                  label="Tipo"
                  value={form.descontoAtivado?.tipo}
                  onChange={(e) => setF({ descontoAtivado: { ...(form.descontoAtivado as any), tipo: e.target.value as any } })}
                  options={[{ value: 'percentual', label: 'Percentual (%)' }, { value: 'fixo', label: 'Valor fixo (R$)' }]}
                />
                <GlassInput label="Valor" type="number" min={0} step="0.01" value={String(form.descontoAtivado?.valor ?? 0)} onChange={(e) => setF({ descontoAtivado: { ...(form.descontoAtivado as any), valor: Number(e.target.value) } })} />
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4 accent-primary-500" checked={!!form.disponivel} onChange={(e) => setF({ disponivel: e.target.checked })} /> Disponível na loja</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4 accent-primary-500" checked={form.ativo !== false} onChange={(e) => setF({ ativo: e.target.checked })} /> Ativo</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4 accent-primary-500" checked={!!form.destaque} onChange={(e) => setF({ destaque: e.target.checked })} /> Destaque</label>
          </div>

          {/* Conteúdos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Conteúdos ({(form.conteudos || []).length})</h4>
              <GlassButton variant="secondary" size="sm" onClick={addConteudo} leftIcon={<Plus className="w-3.5 h-3.5" />}>Adicionar</GlassButton>
            </div>
            <div className="space-y-3">
              {(form.conteudos || []).map((c, i) => (
                <div key={i} className="p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1">
                      {c.tipo === 'aula' ? <Video className="w-3.5 h-3.5" /> : c.tipo === 'pdf' ? <FileText className="w-3.5 h-3.5" /> : <File className="w-3.5 h-3.5" />}
                      Conteúdo {i + 1}
                    </span>
                    <button onClick={() => removeConteudo(i)} className="p-1 rounded hover:bg-red-500/10 text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <GlassSelect
                      label="Tipo"
                      value={c.tipo}
                      onChange={(e) => updateConteudo(i, { tipo: e.target.value as ConteudoTipo })}
                      options={[{ value: 'aula', label: 'Aula (vídeo)' }, { value: 'pdf', label: 'PDF' }, { value: 'arquivo', label: 'Arquivo' }]}
                    />
                    <GlassInput label="Título" value={c.titulo} onChange={(e) => updateConteudo(i, { titulo: e.target.value })} />
                  </div>
                  <GlassInput className="mt-3" label="Descrição (opcional)" value={c.descricao || ''} onChange={(e) => updateConteudo(i, { descricao: e.target.value })} />
                  {c.tipo === 'aula' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <div className="sm:col-span-2">
                        <GlassInput label="Embed do vídeo (URL YouTube/Vimeo)" value={c.embedVideo || ''} onChange={(e) => updateConteudo(i, { embedVideo: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                      </div>
                      <GlassInput label="Duração (min)" type="number" min={0} value={String(c.duracao ?? '')} onChange={(e) => updateConteudo(i, { duracao: Number(e.target.value) })} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <GlassInput label="URL do arquivo" value={c.arquivoUrl || ''} onChange={(e) => updateConteudo(i, { arquivoUrl: e.target.value })} placeholder="https://.../arquivo.pdf" />
                      <GlassInput label="Nome de download" value={c.nomeArquivo || ''} onChange={(e) => updateConteudo(i, { nomeArquivo: e.target.value })} placeholder="apostila.pdf" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-[var(--glass-border)] pt-4">
          <GlassButton variant="secondary" onClick={() => setShowForm(false)}>Cancelar</GlassButton>
          <GlassButton variant="primary" onClick={handleSave} isLoading={saving} disabled={saving}>{editing ? 'Salvar' : 'Criar'}</GlassButton>
        </div>
      </GlassModal>

      {/* Modal conceder acesso */}
      <GlassModal isOpen={!!grantFor} onClose={() => setGrantFor(null)} title="Conceder acesso (cortesia)" size="md">
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Concede acesso ao material <strong>{grantFor?.titulo}</strong> para um e-mail. Um link de acesso será gerado e copiado.
        </p>
        <GlassInput label="E-mail" type="email" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="pessoa@email.com" />
        <div className="mt-4 flex justify-end gap-2">
          <GlassButton variant="secondary" onClick={() => setGrantFor(null)}>Cancelar</GlassButton>
          <GlassButton variant="primary" onClick={handleGrant} isLoading={granting} disabled={granting} leftIcon={<Gift className="w-4 h-4" />}>Conceder</GlassButton>
        </div>
      </GlassModal>

      {/* Modal detalhe pedido */}
      <GlassModal isOpen={!!orderDetail} onClose={() => setOrderDetail(null)} title="Detalhe da venda" size="lg">
        {orderDetail && (
          <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs">{orderDetail.numeroPedido}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(orderDetail.status)}`}>{orderDetail.status}</span>
              {orderDetail.status === 'aprovado' && !orderDetail.emailEnviado && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> e-mail não enviado</span>
              )}
            </div>
            <Row k="Material" v={orderDetail.materialTitulo} />
            <Row k="Comprador" v={orderDetail.compradorDados?.nome} />
            <Row k="E-mail" v={orderDetail.compradorDados?.email} />
            <Row k="Telefone" v={orderDetail.compradorDados?.telefone} />
            <Row k="Total" v={brl(orderDetail.valores?.total || 0)} />
            <Row k="Método" v={orderDetail.metodoPagamento || '—'} />
            <Row k="Entregue" v={orderDetail.entregue ? 'Sim' : 'Não'} />
            <Row k="E-mail enviado" v={orderDetail.emailEnviado ? 'Sim' : `Não${orderDetail.emailTentativas ? ` (${orderDetail.emailTentativas} tentativas)` : ''}`} />
            {orderDetail.ultimoEmailErro && <Row k="Último erro de e-mail" v={orderDetail.ultimoEmailErro} />}
            {orderDetail.serialKeyCodigo && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-text-muted)] w-40">Código de acesso</span>
                <code className="font-mono text-primary-500">{orderDetail.serialKeyCodigo}</code>
                <button onClick={() => { navigator.clipboard.writeText(orderDetail.serialKeyCodigo); toast.success('Copiado'); }} className="text-primary-500"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {orderDetail.status === 'aprovado' && (
              <div className="pt-3 border-t border-[var(--glass-border)]">
                <GlassButton variant="primary" onClick={() => handleReprocess(orderDetail._id)} isLoading={reprocessing} disabled={reprocessing} leftIcon={<RefreshCw className="w-4 h-4" />}>
                  Reprocessar entrega e reenviar e-mail
                </GlassButton>
              </div>
            )}
          </div>
        )}
      </GlassModal>
    </div>
  );
};

const Row: React.FC<{ k: string; v?: string }> = ({ k, v }) => (
  <div className="flex gap-2">
    <span className="text-[var(--color-text-muted)] w-40 flex-shrink-0">{k}</span>
    <span className="text-[var(--color-text-primary)] break-all">{v}</span>
  </div>
);

export default AdminMaterials;

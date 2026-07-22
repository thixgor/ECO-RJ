import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Plus, Pencil, Trash2, Loader2, Star, X, Video, FileText, File, Info, Gift, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassButton, GlassInput, GlassTextarea, GlassSelect, GlassModal } from '../../components/ui';
import { materialService } from '../../services/api';
import type { MaterialAdmin, MaterialConteudo, ConteudoTipo, MaterialTipo } from '../../types';

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const emptyConteudo = (): MaterialConteudo => ({ tipo: 'pdf', titulo: '', descricao: '', arquivoUrl: '', nomeArquivo: '' });

const emptyForm = (): Partial<MaterialAdmin> => ({
  titulo: '', descricao: '', descricaoCurta: '', tipo: 'pdf', capa: '',
  conteudos: [], disponivel: true, ativo: true, destaque: false, ordem: 0,
  preco: 0, descontoAtivado: { ativo: false, tipo: 'percentual', valor: 0 }, validadeAcessoDias: 0
});

const AdminMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<MaterialAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaterialAdmin | null>(null);
  const [form, setForm] = useState<Partial<MaterialAdmin>>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Conceder acesso (cortesia / suporte)
  const [grantFor, setGrantFor] = useState<MaterialAdmin | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [granting, setGranting] = useState(false);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await materialService.admin.list();
      setMaterials(res.data.materials || []);
    } catch {
      toast.error('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMaterials(); }, []);

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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-500" /> Materiais
          </h1>
          <p className="text-[var(--color-text-secondary)]">Catálogo de produtos da loja de materiais. As vendas e a receita ficam em <strong>Pagamentos</strong>.</p>
        </div>
        <Link to="/admin/pagamentos" className="inline-flex items-center gap-2 text-sm text-primary-500 hover:underline self-start sm:self-auto">
          <TrendingUp className="w-4 h-4" /> Ver vendas e receita em Pagamentos
        </Link>
      </div>

      {/* Aviso Vercel Blob */}
      <div className="mb-6 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-start gap-3 text-sm text-blue-800 dark:text-blue-300">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>
          Enquanto o <strong>Vercel Blob</strong> não é aplicado, cadastre os arquivos (PDF/arquivo) informando a
          <strong> URL direta</strong> do arquivo no campo correspondente. A migração para upload via Blob já está preparada no backend.
        </span>
      </div>

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
    </div>
  );
};

export default AdminMaterials;

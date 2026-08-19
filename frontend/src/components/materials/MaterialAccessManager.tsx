import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2, Search, ShieldCheck, ShieldOff, Trash2, Link2, CalendarClock, X,
  UserPlus, Mail, Download, Users, Check, Infinity as InfinityIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassButton, GlassInput, GlassSelect, GlassModal, GlassBadge } from '../ui';
import { materialService, userService } from '../../services/api';
import type { MaterialAdmin, MaterialEntitlementAdmin, MaterialEntitlementResumo } from '../../types';
import { formatarData } from '../../utils/datetime';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALIDADE_OPTIONS = [
  { value: '', label: 'Padrão do material' },
  { value: '0', label: 'Vitalício (sem expirar)' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
  { value: '180', label: '180 dias' },
  { value: '365', label: '1 ano' }
];

const fmtData = (d?: string) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : formatarData(date);
};

const statusBadge = (e: MaterialEntitlementAdmin) => {
  if (e.status === 'revogado') return <GlassBadge variant="danger" size="sm">Revogado</GlassBadge>;
  if (e.status === 'expirado') return <GlassBadge variant="warning" size="sm">Expirado</GlassBadge>;
  return <GlassBadge variant="success" size="sm">Ativo</GlassBadge>;
};

const origemLabel: Record<MaterialEntitlementAdmin['origem'], string> = {
  compra: 'Compra',
  cortesia: 'Cortesia',
  admin: 'Manual'
};

interface Props {
  material: MaterialAdmin | null;
  onClose: () => void;
}

/**
 * Painel de gestão de acesso a um material (/admin/materiais).
 *
 * Permite ao administrador ver quem tem acesso, conceder acesso a novos
 * e-mails/contas, revogar, reativar, ajustar validade e remover acessos.
 */
const MaterialAccessManager: React.FC<Props> = ({ material, onClose }) => {
  const isOpen = !!material;

  const [ents, setEnts] = useState<MaterialEntitlementAdmin[]>([]);
  const [resumo, setResumo] = useState<MaterialEntitlementResumo>({ total: 0, validos: 0, revogados: 0, expirados: 0 });
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'' | 'valido' | 'revogado' | 'expirado'>('');

  // --- Conceder acesso ---
  const [emails, setEmails] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ _id: string; nomeCompleto: string; email: string }>>([]);
  const [validadeDias, setValidadeDias] = useState('');
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [granting, setGranting] = useState(false);

  // --- Edição de validade inline ---
  const [editingValidade, setEditingValidade] = useState<string | null>(null);
  const [novaValidade, setNovaValidade] = useState('0');

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const suggestTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    if (!material) return;
    setLoading(true);
    try {
      const res = await materialService.admin.listEntitlements(material._id, {
        search: debouncedSearch || undefined,
        status: status || undefined,
        page,
        limit: 20
      });
      setEnts(res.data.entitlements || []);
      setResumo(res.data.resumo || { total: 0, validos: 0, revogados: 0, expirados: 0 });
      setPages(res.data.pagination?.pages || 1);
    } catch {
      toast.error('Erro ao carregar os acessos');
    } finally {
      setLoading(false);
    }
  }, [material, debouncedSearch, status, page]);

  useEffect(() => { load(); }, [load]);

  // Reinicia o painel a cada material aberto
  useEffect(() => {
    if (!material) return;
    setSearch(''); setDebouncedSearch(''); setStatus(''); setPage(1);
    setEmails([]); setQuery(''); setSuggestions([]); setValidadeDias(''); setEnviarEmail(true);
    setEditingValidade(null);
  }, [material?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); setDebouncedSearch(search.trim()); }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // Sugestões de contas cadastradas ao digitar no campo de concessão
  useEffect(() => {
    clearTimeout(suggestTimer.current);
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await userService.getAll({ search: q, limit: 6 });
        setSuggestions(res.data.users || []);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(suggestTimer.current);
  }, [query]);

  const addEmail = (raw: string) => {
    const partes = raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    const invalidos = partes.filter((e) => !EMAIL_REGEX.test(e));
    if (invalidos.length) return toast.error(`E-mail inválido: ${invalidos[0]}`);
    setEmails((prev) => Array.from(new Set([...prev, ...partes])));
    setQuery('');
    setSuggestions([]);
  };

  const handleGrant = async () => {
    if (!material) return;
    const lista = query.trim() && EMAIL_REGEX.test(query.trim().toLowerCase())
      ? Array.from(new Set([...emails, query.trim().toLowerCase()]))
      : emails;
    if (!lista.length) return toast.error('Adicione ao menos um e-mail');

    setGranting(true);
    try {
      const res = await materialService.admin.grant(material._id, {
        emails: lista,
        validadeDias: validadeDias === '' ? undefined : Number(validadeDias),
        enviarEmail
      });
      toast.success(res.data.message || 'Acesso concedido');
      const erros = (res.data.resultados || []).filter((r: any) => r.acao === 'erro');
      if (erros.length) toast.error(`${erros.length} e-mail(s) não puderam receber acesso`);
      setEmails([]); setQuery('');
      setPage(1);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao conceder acesso');
    } finally {
      setGranting(false);
    }
  };

  const toggleRevogado = async (e: MaterialEntitlementAdmin) => {
    const revogar = !e.revogado && e.ativo;
    if (revogar && !window.confirm(`Revogar o acesso de ${e.email}? A pessoa deixa de ver o conteúdo imediatamente.`)) return;
    setBusyId(e._id);
    try {
      await materialService.admin.updateEntitlement(e._id, { revogado: revogar });
      toast.success(revogar ? 'Acesso revogado' : 'Acesso reativado');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar o acesso');
    } finally {
      setBusyId(null);
    }
  };

  const remover = async (e: MaterialEntitlementAdmin) => {
    if (!window.confirm(`Remover definitivamente o acesso de ${e.email}? Esta ação não pode ser desfeita.`)) return;
    setBusyId(e._id);
    try {
      await materialService.admin.deleteEntitlement(e._id);
      toast.success('Acesso removido');
      await load();
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.requerConfirmacao) {
        if (window.confirm(`${err.response.data.message}\n\nExcluir mesmo assim?`)) {
          try {
            await materialService.admin.deleteEntitlement(e._id, true);
            toast.success('Acesso removido');
            await load();
          } catch (err2: any) {
            toast.error(err2.response?.data?.message || 'Erro ao remover o acesso');
          }
        }
      } else {
        toast.error(err.response?.data?.message || 'Erro ao remover o acesso');
      }
    } finally {
      setBusyId(null);
    }
  };

  const salvarValidade = async (e: MaterialEntitlementAdmin) => {
    setBusyId(e._id);
    try {
      await materialService.admin.updateEntitlement(e._id, { validadeDias: Number(novaValidade) || 0 });
      toast.success('Validade atualizada');
      setEditingValidade(null);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar a validade');
    } finally {
      setBusyId(null);
    }
  };

  const copiarLink = async (e: MaterialEntitlementAdmin) => {
    try {
      await navigator.clipboard.writeText(e.accessLink);
      toast.success('Link de acesso copiado');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerenciar acesso ao material"
      description={material ? <span className="text-[var(--color-text-secondary)]">{material.titulo}</span> : undefined}
      size="full"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-xs text-[var(--color-text-muted)] hidden sm:block">
            Revogar mantém o histórico; remover apaga o acesso definitivamente.
          </span>
          <GlassButton variant="secondary" onClick={onClose}>Fechar</GlassButton>
        </div>
      }
    >
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Com acesso', value: resumo.total, icon: <Users className="w-4 h-4" />, color: 'text-primary-500' },
          { label: 'Ativos', value: resumo.validos, icon: <ShieldCheck className="w-4 h-4" />, color: 'text-emerald-500' },
          { label: 'Revogados', value: resumo.revogados, icon: <ShieldOff className="w-4 h-4" />, color: 'text-red-500' },
          { label: 'Expirados', value: resumo.expirados, icon: <CalendarClock className="w-4 h-4" />, color: 'text-amber-500' }
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
            <div className={`flex items-center gap-1.5 text-xs ${s.color}`}>{s.icon} {s.label}</div>
            <div className="text-xl font-bold text-[var(--color-text-primary)] mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Conceder acesso */}
      <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] mb-5">
        <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-primary-500" /> Conceder acesso
        </h4>

        {emails.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {emails.map((e) => (
              <span key={e} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary-500/10 text-primary-600 dark:text-primary-300 border border-primary-500/30">
                {e}
                <button onClick={() => setEmails((prev) => prev.filter((x) => x !== e))} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <GlassInput
            label="E-mail ou nome de um usuário cadastrado"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); if (query.trim()) addEmail(query); }
            }}
            placeholder="pessoa@email.com (Enter para adicionar vários)"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated,var(--glass-bg))] backdrop-blur-xl shadow-lg overflow-hidden">
              {suggestions.map((u) => (
                <button
                  key={u._id}
                  onClick={() => addEmail(u.email)}
                  className="w-full text-left px-3 py-2 hover:bg-primary-500/10 flex items-center justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--color-text-primary)] truncate">{u.nomeCompleto}</span>
                    <span className="block text-xs text-[var(--color-text-muted)] truncate">{u.email}</span>
                  </span>
                  <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <GlassSelect
            label="Validade do acesso"
            value={validadeDias}
            onChange={(ev) => setValidadeDias(ev.target.value)}
            options={VALIDADE_OPTIONS}
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm pb-2.5 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary-500" checked={enviarEmail} onChange={(ev) => setEnviarEmail(ev.target.checked)} />
              <Mail className="w-4 h-4 text-primary-500" /> Avisar por e-mail com o link de acesso
            </label>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <GlassButton
            variant="primary"
            onClick={handleGrant}
            isLoading={granting}
            disabled={granting}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Conceder acesso
          </GlassButton>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <GlassInput
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou código"
          />
        </div>
        <div className="sm:w-56">
          <GlassSelect
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value as any); }}
            options={[
              { value: '', label: 'Todos os status' },
              { value: 'valido', label: 'Ativos' },
              { value: 'revogado', label: 'Revogados' },
              { value: 'expirado', label: 'Expirados' }
            ]}
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
      ) : ents.length === 0 ? (
        <div className="p-8 text-center text-[var(--color-text-muted)] text-sm border border-dashed border-[var(--glass-border)] rounded-xl">
          {debouncedSearch || status ? 'Nenhum acesso encontrado com esses filtros.' : 'Ninguém tem acesso a este material ainda.'}
        </div>
      ) : (
        <div className="space-y-2">
          {ents.map((e) => (
            <div key={e._id} className="p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--color-text-primary)] truncate">
                      {e.user?.nomeCompleto || e.email}
                    </span>
                    {statusBadge(e)}
                    <GlassBadge variant={e.origem === 'compra' ? 'primary' : 'default'} size="sm">
                      {origemLabel[e.origem]}
                    </GlassBadge>
                    {!e.user && <GlassBadge variant="info" size="sm">Sem conta vinculada</GlassBadge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mt-1 flex-wrap">
                    {e.user && <span className="truncate">{e.email}</span>}
                    <span className="font-mono">{e.serialKey}</span>
                    <span>Desde {fmtData(e.createdAt)}</span>
                    <span className="flex items-center gap-1">
                      {e.validade
                        ? <><CalendarClock className="w-3 h-3" /> até {fmtData(e.validade)}</>
                        : <><InfinityIcon className="w-3 h-3" /> vitalício</>}
                    </span>
                    {e.totalDownloads > 0 && (
                      <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {e.totalDownloads}</span>
                    )}
                    {e.order?.numeroPedido && <span>Pedido {e.order.numeroPedido}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {busyId === e._id && <Loader2 className="w-4 h-4 animate-spin text-primary-500 mr-1" />}
                  <button
                    onClick={() => copiarLink(e)}
                    className="p-2 rounded-lg hover:bg-[var(--glass-bg)] text-primary-500"
                    title="Copiar link de acesso"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingValidade(editingValidade === e._id ? null : e._id);
                      setNovaValidade('0');
                    }}
                    className="p-2 rounded-lg hover:bg-[var(--glass-bg)] text-amber-500"
                    title="Alterar validade"
                  >
                    <CalendarClock className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleRevogado(e)}
                    disabled={busyId === e._id}
                    className={`p-2 rounded-lg hover:bg-[var(--glass-bg)] ${e.revogado || !e.ativo ? 'text-emerald-500' : 'text-orange-500'}`}
                    title={e.revogado || !e.ativo ? 'Reativar acesso' : 'Revogar acesso'}
                  >
                    {e.revogado || !e.ativo ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => remover(e)}
                    disabled={busyId === e._id}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"
                    title="Remover acesso definitivamente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {editingValidade === e._id && (
                <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <GlassSelect
                      label="Nova validade (a partir de hoje)"
                      value={novaValidade}
                      onChange={(ev) => setNovaValidade(ev.target.value)}
                      options={VALIDADE_OPTIONS.filter((o) => o.value !== '')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <GlassButton variant="secondary" size="sm" onClick={() => setEditingValidade(null)}>Cancelar</GlassButton>
                    <GlassButton variant="primary" size="sm" onClick={() => salvarValidade(e)} disabled={busyId === e._id}>Salvar</GlassButton>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <GlassButton variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</GlassButton>
          <span className="text-sm text-[var(--color-text-muted)]">Página {page} de {pages}</span>
          <GlassButton variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</GlassButton>
        </div>
      )}
    </GlassModal>
  );
};

export default MaterialAccessManager;

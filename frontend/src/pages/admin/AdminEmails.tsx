import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail, Send, FileText, History, Eye, Edit2, RotateCcw, Search,
  Users, AlertTriangle, CheckCircle2, XCircle, Clock,
  RefreshCw, Trash2, X, Info, Filter, Sparkles
} from 'lucide-react';
import { emailService, courseService } from '../../services/api';
import {
  EmailTemplate, EmailRecipient, EmailLog, EmailConfig, EmailStats, Course
} from '../../types';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

// Variáveis preenchidas automaticamente pelo sistema (não precisam de input manual)
const AUTO_VARS = ['nome', 'nomecompleto', 'email', 'cargo', 'linkplataforma'];
// Variáveis que merecem um campo maior (textarea)
const LONG_VARS = ['mensagem', 'descricaocurso'];

const CARGOS = ['Visitante', 'Aluno', 'Instrutor', 'Administrador'];

type Tab = 'enviar' | 'templates' | 'historico';

const AdminEmails: React.FC = () => {
  const [tab, setTab] = useState<Tab>('enviar');
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBase();
  }, []);

  const loadBase = async () => {
    setIsLoading(true);
    try {
      const [cfgRes, tplRes, courseRes, statsRes] = await Promise.all([
        emailService.getConfig(),
        emailService.getTemplates(),
        courseService.getAll(),
        emailService.getStats()
      ]);
      setConfig(cfgRes.data);
      setTemplates(tplRes.data.templates || []);
      setCourses(courseRes.data.courses || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados de e-mail:', error);
      toast.error('Erro ao carregar o painel de e-mails');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8"><Loading /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary-500" />
            E-mails
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Envie e-mails para seus usuários, gerencie templates e acompanhe o histórico
          </p>
        </div>
        {stats && (
          <div className="flex gap-3 text-sm">
            <div className="card px-4 py-2 text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.total}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Total enviados</p>
            </div>
            <div className="card px-4 py-2 text-center">
              <p className="text-lg font-bold text-green-500">{stats.porStatus.enviado}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Entregues</p>
            </div>
            <div className="card px-4 py-2 text-center">
              <p className="text-lg font-bold text-red-500">{stats.porStatus.falhou}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Falhas</p>
            </div>
          </div>
        )}
      </div>

      {/* Aviso de modo simulado */}
      {config && !config.configured && (
        <div className="rounded-xl border border-yellow-300 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-800 dark:text-yellow-300">Modo simulado ativo</p>
            <p className="text-yellow-700 dark:text-yellow-400/80">
              O envio de e-mails (SMTP) ainda não foi configurado. Os e-mails são registrados no histórico,
              mas <strong>não são enviados de verdade</strong>. Configure as variáveis <code>SMTP_*</code> no
              servidor para ativar o envio real.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5 w-fit">
        {([
          { id: 'enviar', label: 'Enviar', icon: Send },
          { id: 'templates', label: 'Templates', icon: FileText },
          { id: 'historico', label: 'Histórico', icon: History }
        ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'enviar' && (
        <SendTab templates={templates} courses={courses} config={config} />
      )}
      {tab === 'templates' && (
        <TemplatesTab templates={templates} onChanged={loadBase} />
      )}
      {tab === 'historico' && <HistoryTab />}
    </div>
  );
};

/* ======================================================================== */
/*  Aba: Enviar                                                             */
/* ======================================================================== */

const SendTab: React.FC<{
  templates: EmailTemplate[];
  courses: Course[];
  config: EmailConfig | null;
}> = ({ templates, courses, config }) => {
  const manualTemplates = templates.filter((t) => t.categoria === 'manual');
  const [templateKey, setTemplateKey] = useState(manualTemplates[0]?.key || 'personalizado');
  const [vars, setVars] = useState<Record<string, string>>({});

  // Segmentação
  const [cargo, setCargo] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [search, setSearch] = useState('');
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const selectedTemplate = templates.find((t) => t.key === templateKey);

  // Campos de variáveis que o admin deve preencher
  const editableVars = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.variaveis.filter(
      (v) => !AUTO_VARS.includes(v.toLowerCase())
    );
  }, [selectedTemplate]);

  // Carregar destinatários quando filtros mudam
  useEffect(() => {
    const t = setTimeout(loadRecipients, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargo, cursoId, search]);

  const loadRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const res = await emailService.getRecipients({
        cargo: cargo || undefined,
        cursoId: cursoId || undefined,
        search: search || undefined
      });
      setRecipients(res.data.recipients || []);
      setTotalRecipients(res.data.total || 0);
      // Remover selecionados que saíram da lista
      setSelectedIds((prev) =>
        prev.filter((id) => (res.data.recipients || []).some((r: EmailRecipient) => r._id === id))
      );
    } catch (error) {
      console.error('Erro ao carregar destinatários:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelected = recipients.length > 0 && selectedIds.length === recipients.length;
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : recipients.map((r) => r._id));
  };

  const destinatariosCount = selectedIds.length > 0 ? selectedIds.length : totalRecipients;

  const buildPayload = () => ({
    templateKey,
    vars,
    ...(selectedIds.length > 0
      ? { userIds: selectedIds }
      : { filtro: { cargo: cargo || undefined, cursoId: cursoId || undefined, search: search || undefined } })
  });

  const handlePreview = async () => {
    try {
      const res = await emailService.preview({ templateKey, vars });
      setPreviewHtml(res.data.html);
      setPreviewSubject(res.data.subject);
      setShowPreview(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar pré-visualização');
    }
  };

  const handleSend = async () => {
    if (destinatariosCount === 0) {
      toast.error('Nenhum destinatário selecionado');
      return;
    }
    const confirmMsg = config?.configured
      ? `Enviar este e-mail para ${destinatariosCount} destinatário(s)?`
      : `Modo simulado: o e-mail será registrado para ${destinatariosCount} destinatário(s), mas NÃO será enviado de verdade. Continuar?`;
    if (!confirm(confirmMsg)) return;

    setIsSending(true);
    try {
      const res = await emailService.send(buildPayload());
      toast.success(res.data.message || 'E-mails processados');
      setSelectedIds([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar e-mails');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna esquerda: Conteúdo */}
      <div className="space-y-4">
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" /> 1. Conteúdo do e-mail
          </h3>

          <div>
            <label className="label">Template</label>
            <select
              value={templateKey}
              onChange={(e) => { setTemplateKey(e.target.value); setVars({}); }}
              className="input"
            >
              {manualTemplates.map((t) => (
                <option key={t.key} value={t.key}>{t.nome}</option>
              ))}
            </select>
            {selectedTemplate?.descricao && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{selectedTemplate.descricao}</p>
            )}
          </div>

          {editableVars.map((v) => {
            const isLong = LONG_VARS.includes(v.toLowerCase());
            return (
              <div key={v}>
                <label className="label capitalize">{labelForVar(v)}</label>
                {isLong ? (
                  <textarea
                    value={vars[v] || ''}
                    onChange={(e) => setVars({ ...vars, [v]: e.target.value })}
                    className="input min-h-[120px] resize-y"
                    placeholder={`Digite ${labelForVar(v).toLowerCase()}...`}
                  />
                ) : (
                  <input
                    type="text"
                    value={vars[v] || ''}
                    onChange={(e) => setVars({ ...vars, [v]: e.target.value })}
                    className="input"
                    placeholder={`Digite ${labelForVar(v).toLowerCase()}...`}
                  />
                )}
              </div>
            );
          })}

          <div className="text-xs text-[var(--color-text-muted)] flex items-start gap-2 bg-gray-50 dark:bg-white/5 rounded-lg p-3">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary-500" />
            <span>
              O nome do destinatário e os links são inseridos automaticamente.
              Use a pré-visualização para conferir o resultado final.
            </span>
          </div>

          <button onClick={handlePreview} className="btn btn-outline w-full">
            <Eye className="w-4 h-4" /> Pré-visualizar
          </button>
        </div>
      </div>

      {/* Coluna direita: Destinatários */}
      <div className="space-y-4">
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary-500" /> 2. Destinatários
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Cargo</label>
              <select value={cargo} onChange={(e) => setCargo(e.target.value)} className="input">
                <option value="">Todos os cargos</option>
                {CARGOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Com acesso ao curso</label>
              <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className="input">
                <option value="">Qualquer curso</option>
                {courses.map((c) => <option key={c._id} value={c._id}>{c.titulo}</option>)}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
              placeholder="Buscar por nome ou e-mail..."
            />
          </div>

          {/* Contagem + selecionar todos */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">
              {loadingRecipients ? 'Carregando...' : (
                <><Users className="w-4 h-4 inline mr-1" />{totalRecipients} destinatário(s) no filtro</>
              )}
            </span>
            {recipients.length > 0 && (
              <button onClick={toggleSelectAll} className="text-primary-500 hover:underline">
                {allSelected ? 'Limpar seleção' : 'Selecionar todos'}
              </button>
            )}
          </div>

          {/* Lista de destinatários */}
          <div className="border border-[var(--glass-border)] rounded-lg max-h-72 overflow-y-auto divide-y divide-[var(--glass-border)]">
            {recipients.length === 0 && !loadingRecipients && (
              <div className="p-6 text-center text-sm text-[var(--color-text-muted)]">
                Nenhum destinatário encontrado
              </div>
            )}
            {recipients.map((r) => (
              <label
                key={r._id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(r._id)}
                  onChange={() => toggleSelect(r._id)}
                  className="w-4 h-4 rounded accent-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{r.nomeCompleto}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{r.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                  {r.cargo}
                </span>
              </label>
            ))}
          </div>
          {totalRecipients > recipients.length && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Exibindo os primeiros {recipients.length}. Sem seleção individual, o envio abrange todos os {totalRecipients}.
            </p>
          )}
        </div>

        {/* Botão de envio */}
        <button
          onClick={handleSend}
          disabled={isSending || destinatariosCount === 0}
          className="btn btn-primary w-full py-3"
        >
          <Send className="w-4 h-4" />
          {isSending
            ? 'Enviando...'
            : `Enviar para ${destinatariosCount} destinatário(s)`}
        </button>
      </div>

      {/* Modal de pré-visualização */}
      {showPreview && (
        <PreviewModal
          html={previewHtml || ''}
          subject={previewSubject}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

/* ======================================================================== */
/*  Aba: Templates                                                          */
/* ======================================================================== */

const TemplatesTab: React.FC<{
  templates: EmailTemplate[];
  onChanged: () => void;
}> = ({ templates, onChanged }) => {
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);

  const sistema = templates.filter((t) => t.categoria === 'sistema');
  const manuais = templates.filter((t) => t.categoria === 'manual');

  const handlePreview = async (t: EmailTemplate) => {
    try {
      const res = await emailService.preview({ templateKey: t.key });
      setPreview({ html: res.data.html, subject: res.data.subject });
    } catch {
      toast.error('Erro ao gerar pré-visualização');
    }
  };

  const renderCard = (t: EmailTemplate) => (
    <div key={t._id} className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[var(--color-text-primary)]">{t.nome}</p>
            {t.categoria === 'sistema' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                Automático
              </span>
            )}
            {t.categoria === 'sistema' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                t.ativo
                  ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-500/20'
              }`}>
                {t.ativo ? 'Ativo' : 'Desativado'}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">{t.descricao}</p>
        </div>
      </div>
      <div className="text-xs text-[var(--color-text-muted)]">
        <span className="font-medium">Assunto:</span> {t.assunto}
      </div>
      {t.variaveis.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.variaveis.map((v) => (
            <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-[var(--color-text-muted)] font-mono">
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-auto pt-2">
        <button onClick={() => handlePreview(t)} className="btn btn-outline flex-1 !py-1.5 text-sm">
          <Eye className="w-4 h-4" /> Ver
        </button>
        <button onClick={() => setEditing(t)} className="btn btn-primary flex-1 !py-1.5 text-sm">
          <Edit2 className="w-4 h-4" /> Editar
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary-500" /> E-mails automáticos
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Disparados automaticamente pelo sistema (cadastro, compra e término de curso).
          Você pode editar o texto ou desativar o disparo.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sistema.map(renderCard)}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-500" /> Templates para envio manual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {manuais.map(renderCard)}
        </div>
      </div>

      {editing && (
        <TemplateEditModal
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged(); }}
        />
      )}

      {preview && (
        <PreviewModal html={preview.html} subject={preview.subject} onClose={() => setPreview(null)} />
      )}
    </div>
  );
};

const TemplateEditModal: React.FC<{
  template: EmailTemplate;
  onClose: () => void;
  onSaved: () => void;
}> = ({ template, onClose, onSaved }) => {
  const [nome, setNome] = useState(template.nome);
  const [descricao, setDescricao] = useState(template.descricao);
  const [assunto, setAssunto] = useState(template.assunto);
  const [corpoHtml, setCorpoHtml] = useState(template.corpoHtml);
  const [ativo, setAtivo] = useState(template.ativo);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);

  const handleSave = async () => {
    if (!assunto.trim() || !corpoHtml.trim()) {
      toast.error('Assunto e corpo são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await emailService.updateTemplate(template._id, {
        nome: template.sistema ? undefined : nome,
        descricao, assunto, corpoHtml, ativo
      });
      toast.success('Template atualizado');
      onSaved();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Restaurar este template ao padrão original? As alterações serão perdidas.')) return;
    try {
      const res = await emailService.resetTemplate(template._id);
      const t = res.data.template;
      setNome(t.nome); setDescricao(t.descricao); setAssunto(t.assunto); setCorpoHtml(t.corpoHtml);
      toast.success('Template restaurado ao padrão');
    } catch {
      toast.error('Erro ao restaurar template');
    }
  };

  const handlePreview = async () => {
    try {
      const res = await emailService.preview({ assunto, corpoHtml });
      setPreview({ html: res.data.html, subject: res.data.subject });
    } catch {
      toast.error('Erro ao gerar pré-visualização');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="modal-content !max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="p-5 border-b border-[var(--glass-border)] flex items-center justify-between sticky top-0 bg-[var(--color-bg-primary)] z-10">
          <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
            Editar: {template.nome}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {!template.sistema && (
            <div>
              <label className="label">Nome do template</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="input" />
            </div>
          )}

          <div>
            <label className="label">Descrição</label>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="input" />
          </div>

          <div>
            <label className="label">Assunto *</label>
            <input value={assunto} onChange={(e) => setAssunto(e.target.value)} className="input" />
          </div>

          <div>
            <label className="label">Corpo (HTML) *</label>
            <textarea
              value={corpoHtml}
              onChange={(e) => setCorpoHtml(e.target.value)}
              className="input min-h-[240px] resize-y font-mono text-xs"
            />
          </div>

          {template.variaveis.length > 0 && (
            <div className="text-xs text-[var(--color-text-muted)] bg-gray-50 dark:bg-white/5 rounded-lg p-3">
              <p className="font-medium mb-1">Variáveis disponíveis:</p>
              <div className="flex flex-wrap gap-1">
                {template.variaveis.map((v) => (
                  <span key={v} className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 font-mono">{`{{${v}}}`}</span>
                ))}
              </div>
            </div>
          )}

          {template.categoria === 'sistema' && (
            <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-500"
              />
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Disparo automático ativo</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Se desativado, este e-mail não será enviado automaticamente.
                </p>
              </div>
            </label>
          )}
        </div>

        <div className="p-5 border-t border-[var(--glass-border)] flex flex-wrap gap-3 sticky bottom-0 bg-[var(--color-bg-primary)]">
          <button onClick={handlePreview} className="btn btn-outline">
            <Eye className="w-4 h-4" /> Pré-visualizar
          </button>
          <button onClick={handleReset} className="btn btn-outline text-orange-500 border-orange-300">
            <RotateCcw className="w-4 h-4" /> Padrão
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {preview && (
        <PreviewModal html={preview.html} subject={preview.subject} onClose={() => setPreview(null)} />
      )}
    </div>
  );
};

/* ======================================================================== */
/*  Aba: Histórico                                                          */
/* ======================================================================== */

const HistoryTab: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [categoria, setCategoria] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, categoria, search, page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await emailService.getLogs({
        status: status || undefined,
        categoria: categoria || undefined,
        search: search || undefined,
        page,
        limit: 25
      });
      setLogs(res.data.logs || []);
      setPages(res.data.pagination?.pages || 1);
      setTotal(res.data.pagination?.total || 0);
    } catch {
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Limpar o histórico de e-mails? Esta ação é irreversível.')) return;
    try {
      const res = await emailService.clearLogs({ status: status || undefined });
      toast.success(res.data.message);
      setPage(1);
      load();
    } catch {
      toast.error('Erro ao limpar histórico');
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { cls: string; icon: any; label: string }> = {
      enviado: { cls: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400', icon: CheckCircle2, label: 'Enviado' },
      falhou: { cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: XCircle, label: 'Falhou' },
      simulado: { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', icon: Clock, label: 'Simulado' },
      pendente: { cls: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400', icon: Clock, label: 'Pendente' }
    };
    const it = map[s] || map.pendente;
    const Icon = it.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${it.cls}`}>
        <Icon className="w-3 h-3" /> {it.label}
      </span>
    );
  };

  const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
            placeholder="Buscar por e-mail, nome ou assunto..."
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input md:w-40">
          <option value="">Todos os status</option>
          <option value="enviado">Enviado</option>
          <option value="falhou">Falhou</option>
          <option value="simulado">Simulado</option>
        </select>
        <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1); }} className="input md:w-40">
          <option value="">Todas as origens</option>
          <option value="sistema">Automático</option>
          <option value="manual">Manual</option>
        </select>
        <button onClick={handleClear} className="btn bg-red-500 hover:bg-red-600 text-white">
          <Trash2 className="w-4 h-4" /> Limpar
        </button>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8"><Loading /></div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>Nenhum e-mail no histórico</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-[var(--glass-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Destinatário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Assunto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Origem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{log.nomeDestinatario || '-'}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{log.para}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--color-text-primary)] line-clamp-1 max-w-xs">{log.assunto}</p>
                      {log.erro && <p className="text-xs text-red-500 line-clamp-1">{log.erro}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-[var(--color-text-muted)]">
                        {log.categoria === 'sistema' ? 'Automático' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] whitespace-nowrap">{fmt(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-muted)]">{total} registro(s)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-outline !py-1.5 disabled:opacity-40">Anterior</button>
            <span className="px-3 py-1.5 text-sm text-[var(--color-text-muted)]">{page} / {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="btn btn-outline !py-1.5 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ======================================================================== */
/*  Modal de pré-visualização (iframe isolado)                              */
/* ======================================================================== */

const PreviewModal: React.FC<{ html: string; subject: string; onClose: () => void }> = ({ html, subject, onClose }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
    <div className="modal-content !max-w-2xl w-full max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-text-muted)]">Assunto</p>
          <p className="font-medium text-[var(--color-text-primary)] truncate">{subject || '(sem assunto)'}</p>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          title="Pré-visualização do e-mail"
          srcDoc={html}
          sandbox=""
          className="w-full h-[65vh] border-0"
        />
      </div>
    </div>
  </div>
);

/* ======================================================================== */

function labelForVar(v: string): string {
  const map: Record<string, string> = {
    titulo: 'Título',
    mensagem: 'Mensagem',
    tituloaula: 'Título da aula',
    curso: 'Curso',
    textobotao: 'Texto do botão',
    linkoferta: 'Link da oferta',
    linkaula: 'Link da aula'
  };
  return map[v.toLowerCase()] || v.charAt(0).toUpperCase() + v.slice(1);
}

export default AdminEmails;

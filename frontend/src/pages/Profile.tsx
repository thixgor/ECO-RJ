import React, { useState, useEffect } from 'react';
import { User, Mail, CreditCard, Calendar, Stethoscope, Key, Lock, Edit, Check, X, AlertCircle, Award, Download, Clock, BookOpen, StickyNote, Play, Trash2, ShoppingBag, Receipt, MapPin, Building2, GraduationCap, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService, userService, certificateService, notesService, paymentService, materialService } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import { Certificate, User as UserType, Course, UserNote, GroupedNotesByCourse, NoteDisplay } from '../types';
import { generateCertificatePDF } from '../utils/certificatePdfGenerator';
import Loading from '../components/common/Loading';
import { ESTADOS } from '../data/cadastroData';
import { getRoleInfo, hasContentAccess } from '../config/roles';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'info' | 'serial' | 'password' | 'certificados' | 'notas' | 'compras' | 'materiais'>(
    searchParams.get('tab') === 'materiais' ? 'materiais' : 'info'
  );

  // Compras (pedidos)
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Meus materiais (entitlements)
  const [materiais, setMateriais] = useState<any[]>([]);
  const [isLoadingMateriais, setIsLoadingMateriais] = useState(false);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    nomeCompleto: user?.nomeCompleto || '',
    especialidade: user?.especialidade || '',
    bio: user?.bio || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Serial key state
  const [serialKey, setSerialKey] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [showSerialKeyModal, setShowSerialKeyModal] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Certificates state
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Notes state
  const [userNotes, setUserNotes] = useState<GroupedNotesByCourse[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState<string | null>(null);

  // Load certificates when tab changes to certificados
  useEffect(() => {
    if (activeTab === 'certificados') {
      loadCertificates();
    }
    if (activeTab === 'notas') {
      loadUserNotes();
    }
    if (activeTab === 'compras') {
      loadOrders();
    }
    if (activeTab === 'materiais') {
      loadMateriais();
    }
  }, [activeTab]);

  const loadMateriais = async () => {
    setIsLoadingMateriais(true);
    try {
      const response = await materialService.getMy();
      setMateriais(response.data.materiais || []);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      toast.error('Erro ao carregar materiais');
    } finally {
      setIsLoadingMateriais(false);
    }
  };

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await paymentService.getMyOrders();
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
      toast.error('Erro ao carregar compras');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const brlFmt = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

  const statusLabelMap: Record<string, string> = {
    aprovado: 'Aprovado', pendente: 'Pendente', em_processo: 'Em processo',
    rejeitado: 'Rejeitado', cancelado: 'Cancelado', reembolsado: 'Reembolsado'
  };

  const printReceipt = (order: any) => {
    const v = order.valores || {};
    const win = window.open('', '_blank', 'width=720,height=900');
    if (!win) { toast.error('Permita pop-ups para baixar o comprovante'); return; }
    const linhas: string[] = [];
    if (v.descontoLote > 0) linhas.push(`<tr><td>Desconto (lote)</td><td style="text-align:right;color:#059669">- ${brlFmt(v.descontoLote)}</td></tr>`);
    if (v.descontoAtivado > 0) linhas.push(`<tr><td>Desconto promocional</td><td style="text-align:right;color:#059669">- ${brlFmt(v.descontoAtivado)}</td></tr>`);
    if (v.descontoCupom > 0) linhas.push(`<tr><td>Cupom ${order.cupomAplicado?.codigo || ''}</td><td style="text-align:right;color:#059669">- ${brlFmt(v.descontoCupom)}</td></tr>`);
    win.document.write(`
      <html><head><title>Comprovante ${order.numeroPedido}</title>
      <style>body{font-family:Arial,sans-serif;color:#1e293b;max-width:640px;margin:24px auto;padding:0 16px}
      h1{color:#1D4ED8;margin:0}table{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}
      td{padding:4px 0}.tot{border-top:1px solid #e2e8f0;font-weight:bold;font-size:16px;padding-top:10px}
      .muted{color:#64748b}.badge{display:inline-block;padding:4px 12px;border-radius:999px;background:#DCFCE7;color:#166534;font-weight:bold;font-size:12px}</style>
      </head><body>
      <div style="text-align:center;border-bottom:2px solid #E0F2FE;padding-bottom:16px">
        <h1>ECO RJ</h1><p class="muted" style="margin:4px 0 0">Centro de Treinamento em Ecocardiografia</p></div>
      <h2>Comprovante de Compra</h2>
      <p class="muted">Pedido <strong>${order.numeroPedido}</strong></p>
      <p><span class="badge">${statusLabelMap[order.status] || order.status}</span></p>
      <table>
        <tr><td class="muted">Curso</td><td style="text-align:right"><strong>${order.cursoTitulo}</strong></td></tr>
        <tr><td class="muted">Comprador</td><td style="text-align:right">${order.compradorDados?.nome || ''}</td></tr>
        <tr><td class="muted">E-mail</td><td style="text-align:right">${order.compradorDados?.email || ''}</td></tr>
        <tr><td class="muted">Data</td><td style="text-align:right">${new Date(order.createdAt).toLocaleString('pt-BR')}</td></tr>
        ${order.metodoPagamento ? `<tr><td class="muted">Método</td><td style="text-align:right">${order.metodoPagamento}</td></tr>` : ''}
        ${order.serialKeyCodigo ? `<tr><td class="muted">Serial Key</td><td style="text-align:right;font-family:monospace">${order.serialKeyCodigo}</td></tr>` : ''}
      </table>
      <h3>Valores</h3>
      <table>
        <tr><td class="muted">Preço do curso</td><td style="text-align:right">${brlFmt(v.precoBase)}</td></tr>
        ${linhas.join('')}
        <tr><td class="muted">Subtotal</td><td style="text-align:right">${brlFmt(v.subtotal)}</td></tr>
        <tr><td class="muted">Taxa operacional (${v.taxaOperacionalPercentual}%)</td><td style="text-align:right">${brlFmt(v.taxaOperacional)}</td></tr>
        <tr><td class="tot">Total</td><td class="tot" style="text-align:right;color:#1D4ED8">${brlFmt(v.total)}</td></tr>
      </table>
      <p class="muted" style="font-size:11px;margin-top:24px;text-align:center">
        ECO RJ · CNPJ: 21.847.609/0001-70 · contato@cursodeecocardiografia.com</p>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  const loadCertificates = async () => {
    setIsLoadingCertificates(true);
    try {
      const response = await certificateService.getMy();
      setCertificates(response.data);
    } catch (error) {
      console.error('Erro ao carregar certificados:', error);
      toast.error('Erro ao carregar certificados');
    } finally {
      setIsLoadingCertificates(false);
    }
  };

  const loadUserNotes = async () => {
    setIsLoadingNotes(true);
    try {
      const response = await notesService.getMy();
      const responseData = response.data as any;

      // Backend já retorna notas agrupadas em responseData.grouped
      if (responseData.grouped && Array.isArray(responseData.grouped)) {
        // Usar dados já agrupados do backend
        const groupedNotes = responseData.grouped.map((course: any) => ({
          cursoId: course.cursoId,
          cursoTitulo: course.cursoTitulo,
          lessons: (course.aulas || []).map((aula: any) => ({
            lessonId: aula.lessonId,
            lessonTitulo: aula.lessonTitulo,
            notes: (aula.notas || []).map((nota: any): NoteDisplay => ({
              _id: nota._id,
              conteudo: nota.conteudo,
              timestamp: nota.timestamp,
              createdAt: nota.createdAt,
              updatedAt: nota.updatedAt
            })).sort((a: NoteDisplay, b: NoteDisplay) => a.timestamp - b.timestamp)
          }))
        }));
        setUserNotes(groupedNotes);
      } else if (responseData.notes && Array.isArray(responseData.notes)) {
        // Fallback: tentar agrupar manualmente se não vier agrupado
        const notes: UserNote[] = responseData.notes;

        const groupedMap = new Map<string, GroupedNotesByCourse>();

        notes.forEach((note: any) => {
          const cursoId = note.cursoId?._id?.toString() || note.cursoId?.toString() || 'unknown';
          const cursoTitulo = note.cursoId?.titulo || 'Curso';

          if (!groupedMap.has(cursoId)) {
            groupedMap.set(cursoId, {
              cursoId,
              cursoTitulo,
              lessons: []
            });
          }

          const courseGroup = groupedMap.get(cursoId)!;
          const lessonId = note.lessonId?._id?.toString() || note.lessonId?.toString() || 'unknown';
          const lessonTitulo = note.lessonId?.titulo || 'Aula';

          let lessonGroup = courseGroup.lessons.find((l: any) => l.lessonId === lessonId);
          if (!lessonGroup) {
            lessonGroup = {
              lessonId,
              lessonTitulo,
              notes: []
            };
            courseGroup.lessons.push(lessonGroup);
          }

          lessonGroup.notes.push({
            _id: note._id,
            conteudo: note.conteudo,
            timestamp: note.timestamp,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
          } as NoteDisplay);
        });

        // Sort notes within each lesson by timestamp
        groupedMap.forEach(course => {
          course.lessons.forEach(lesson => {
            lesson.notes.sort((a: NoteDisplay, b: NoteDisplay) => a.timestamp - b.timestamp);
          });
        });

        setUserNotes(Array.from(groupedMap.values()));
      } else {
        // Nenhuma nota encontrada
        setUserNotes([]);
      }
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      toast.error('Erro ao carregar notas');
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;

    setIsDeletingNote(noteId);
    try {
      await notesService.delete(noteId);
      // Remove note from state
      setUserNotes(prev => {
        const updated = prev.map(course => ({
          ...course,
          lessons: course.lessons.map(lesson => ({
            ...lesson,
            notes: lesson.notes.filter((n: any) => n._id !== noteId)
          })).filter(lesson => lesson.notes.length > 0)
        })).filter(course => course.lessons.length > 0);
        return updated;
      });
      toast.success('Nota excluída');
    } catch (error) {
      console.error('Erro ao excluir nota:', error);
      toast.error('Erro ao excluir nota');
    } finally {
      setIsDeletingNote(null);
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await authService.updateProfile(editData);
      await refreshUser();
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplySerialKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialKey.trim()) {
      toast.error('Digite uma serial key');
      return;
    }

    setIsApplying(true);
    try {
      const response = await userService.applySerialKey(serialKey);
      await refreshUser();
      setSerialKey('');
      setShowSerialKeyModal(false);
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao aplicar serial key');
    } finally {
      setIsApplying(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      toast.error('As senhas não conferem');
      return;
    }

    if (passwordData.novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(passwordData.senhaAtual, passwordData.novaSenha);
      setPasswordData({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      toast.success('Senha alterada com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDownloadCertificate = async (cert: Certificate) => {
    setIsDownloading(cert._id);
    try {
      const aluno = cert.alunoId as UserType;
      const curso = cert.cursoId as Course;

      // Se os dados do aluno não estão completos, usar os dados do usuário logado
      const alunoCompleto: UserType = aluno?.nomeCompleto ? aluno : (user as UserType);

      await generateCertificatePDF({
        certificate: cert,
        aluno: alunoCompleto,
        curso
      });
    } catch (error) {
      console.error('Erro ao baixar certificado:', error);
      toast.error('Erro ao baixar certificado');
    } finally {
      setIsDownloading(null);
    }
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const estadoNome = user?.estado
    ? (ESTADOS.find((e) => e.uf === user.estado)?.nome
        ? `${ESTADOS.find((e) => e.uf === user.estado)!.nome} (${user.estado})`
        : user.estado)
    : '';

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    return `${hours}h`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
            {user?.fotoPerfil ? (
              <img src={user.fotoPerfil} alt="" className="w-24 h-24 rounded-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <User className="w-12 h-12 text-primary-500" />
            )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">
              {user?.nomeCompleto}
            </h1>
            <p className="text-[var(--color-text-secondary)]">{user?.email}</p>
            <div className="mt-2 flex flex-col md:items-start items-center gap-1">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleInfo(user?.cargo).badgeClass}`}>
                {user?.cargo}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {getRoleInfo(user?.cargo).resumo}
              </span>
            </div>
          </div>
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowSerialKeyModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                Usar Serial Key
              </button>
              <button
                onClick={() => {
                  setEditData({
                    nomeCompleto: user?.nomeCompleto || '',
                    especialidade: user?.especialidade || '',
                    bio: user?.bio || ''
                  });
                  setIsEditing(true);
                }}
                className="btn btn-outline"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Visitor Alert — só para quem não tem nenhum curso liberado */}
      {!hasContentAccess(user) && (
        <div className="bg-yellow-50 dark:bg-amber-500/10 border border-yellow-200 dark:border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-amber-400">Você é Visitante — acesso limitado</h3>
            <p className="text-yellow-700 dark:text-amber-300/80 text-sm mt-1">
              Para virar <strong>Aluno</strong> e liberar aulas, exercícios e fórum, você tem duas opções:
            </p>
            <ul className="text-yellow-700 dark:text-amber-300/80 text-sm mt-2 space-y-1 list-disc list-inside">
              <li>
                <strong>Comprar um curso</strong> — o acesso é liberado automaticamente na sua conta.{' '}
                <Link to="/cursos" className="underline font-medium">Ver cursos</Link>
              </li>
              <li>
                <strong>Ativar uma chave</strong> que você recebeu por e-mail ou do suporte, na aba
                “Serial Key” abaixo.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b overflow-x-auto">
          <nav className="flex min-w-max">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'info'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              Informações
            </button>
            <button
              onClick={() => setActiveTab('certificados')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'certificados'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              <Award className="w-4 h-4" />
              Meus Certificados
            </button>
            <button
              onClick={() => setActiveTab('serial')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'serial'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              Serial Key
            </button>
            <button
              onClick={() => setActiveTab('compras')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'compras'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Minhas Compras
            </button>
            <button
              onClick={() => setActiveTab('materiais')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'materiais'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              <Download className="w-4 h-4" />
              Meus Materiais
            </button>
            <button
              onClick={() => setActiveTab('notas')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'notas'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              <StickyNote className="w-4 h-4" />
              Minhas Notas
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'password'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              Alterar Senha
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {isEditing ? (
                <>
                  <div>
                    <label className="label">Nome Completo</label>
                    <input
                      type="text"
                      value={editData.nomeCompleto}
                      onChange={(e) => setEditData({ ...editData, nomeCompleto: e.target.value })}
                      className="input"
                    />
                  </div>
                  {user?.tipoUsuario === 'Médico' && (
                    <div>
                      <label className="label">Especialidade</label>
                      <input
                        type="text"
                        value={editData.especialidade}
                        onChange={(e) => setEditData({ ...editData, especialidade: e.target.value })}
                        className="input"
                      />
                    </div>
                  )}
                  <div>
                    <label className="label">Bio</label>
                    <textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      className="input min-h-[100px]"
                      maxLength={500}
                    />
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">{editData.bio.length}/500 caracteres</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="btn btn-primary"
                    >
                      <Check className="w-4 h-4" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn btn-outline"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">E-mail</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{user?.email}</p>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">Estado</p>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {estadoNome || 'Não informado'}
                      </p>
                    </div>
                  </div>

                  {/* Tipo de perfil */}
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">Tipo de Perfil</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{user?.tipoUsuario || 'Não informado'}</p>
                    </div>
                  </div>

                  {/* Campos de Médico */}
                  {user?.tipoUsuario === 'Médico' && (
                    <>
                      <div className="flex items-center gap-3">
                        <Stethoscope className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-[var(--color-text-muted)]">Especialidade</p>
                          <p className="font-medium text-[var(--color-text-primary)]">{user?.especialidade || 'Não informada'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-[var(--color-text-muted)]">CRM</p>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {user?.crm ? `${user.crm}-${user.crmLocal || ''}` : '-'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Campos de Residente */}
                  {user?.tipoUsuario === 'Residente' && (
                    <>
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-[var(--color-text-muted)]">Área da Residência</p>
                          <p className="font-medium text-[var(--color-text-primary)]">{user?.areaResidencia || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-[var(--color-text-muted)]">Hospital</p>
                          <p className="font-medium text-[var(--color-text-primary)]">{user?.hospital || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-[var(--color-text-muted)]">Ano da Residência</p>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {user?.anoResidencia || '-'}
                            {user?.semestreResidencia ? ` · ${user.semestreResidencia}` : ''}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Campos de Acadêmico */}
                  {user?.tipoUsuario === 'Acadêmico de Medicina' && (
                    <>
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-[var(--color-text-muted)]">Instituição</p>
                          <p className="font-medium text-[var(--color-text-primary)]">{user?.instituicao || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-[var(--color-text-muted)]">Período</p>
                          <p className="font-medium text-[var(--color-text-primary)]">{user?.periodo || '-'}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* CPF — vinculado à compra (checkout) */}
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">CPF (da compra)</p>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {user?.cpf ? formatCPF(user.cpf) : 'Definido na sua próxima compra'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">Membro desde</p>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  {user?.bio && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-[var(--color-text-muted)]">Bio</p>
                      <p className="font-medium mt-1 text-[var(--color-text-primary)]">{user.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificados' && (
            <div className="space-y-6">
              {isLoadingCertificates ? (
                <Loading />
              ) : certificates.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                    Nenhum certificado encontrado
                  </h3>
                  <p className="text-[var(--color-text-muted)]">
                    Seus certificados aparecerão aqui quando forem emitidos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {certificates.map((cert) => {
                    const curso = cert.cursoId as Course;
                    return (
                      <div
                        key={cert._id}
                        className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-[var(--glass-border)] hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="w-5 h-5 text-primary-500" />
                              <h4 className="font-semibold text-[var(--color-text-primary)]">
                                {curso?.titulo || 'Curso'}
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
                                <Clock className="w-4 h-4" />
                                <span>{formatHours(cert.cargaHoraria)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(cert.dataEmissao)}</span>
                              </div>
                              <div className="col-span-2 md:col-span-1">
                                <code
                                  className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded font-mono text-primary-600 dark:text-primary-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                  title={cert.codigoValidacao}
                                  onClick={() => {
                                    navigator.clipboard.writeText(cert.codigoValidacao);
                                    toast.success('Código copiado!');
                                  }}
                                >
                                  {cert.codigoValidacao.substring(0, 12)}...
                                </code>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadCertificate(cert)}
                            disabled={isDownloading === cert._id}
                            className="btn btn-primary flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            {isDownloading === cert._id ? 'Gerando...' : 'Baixar PDF'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Compras Tab */}
          {activeTab === 'compras' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-5 h-5 text-primary-500" />
                <h3 className="font-heading font-semibold text-lg text-[var(--color-text-primary)]">Minhas Compras</h3>
              </div>

              {isLoadingOrders ? (
                <div className="py-12 text-center text-[var(--color-text-muted)]">Carregando compras...</div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3 opacity-50" />
                  <p className="text-[var(--color-text-muted)]">Você ainda não realizou nenhuma compra.</p>
                  <Link to="/cursos" className="btn btn-primary mt-4 inline-flex">Ver cursos disponíveis</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const statusColor = order.status === 'aprovado'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : order.status === 'rejeitado' || order.status === 'cancelado'
                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
                    return (
                      <div key={order._id} className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--color-text-primary)]">{order.cursoTitulo}</p>
                            <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">{order.numeroPedido}</p>
                            <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-text-muted)]">
                              <Calendar className="w-4 h-4" />
                              {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                              {order.metodoPagamento && <span>· {order.metodoPagamento}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              {statusLabelMap[order.status] || order.status}
                            </span>
                            <p className="font-bold text-primary-500 mt-2">{brlFmt(order.valores?.total || 0)}</p>
                          </div>
                        </div>
                        {order.status === 'aprovado' && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
                            <button
                              onClick={() => printReceipt(order)}
                              className="btn btn-outline btn-sm flex items-center gap-2 text-sm"
                            >
                              <Receipt className="w-4 h-4" />
                              Comprovante
                            </button>
                            {order.serialKeyCodigo && (
                              <span className="text-xs text-[var(--color-text-muted)] font-mono">
                                Chave: {order.serialKeyCodigo}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Meus Materiais Tab */}
          {activeTab === 'materiais' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5 text-primary-500" />
                <h3 className="font-heading font-semibold text-lg text-[var(--color-text-primary)]">Meus Materiais</h3>
              </div>

              {isLoadingMateriais ? (
                <div className="py-12 text-center text-[var(--color-text-muted)]">Carregando materiais...</div>
              ) : materiais.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3 opacity-50" />
                  <p className="text-[var(--color-text-muted)]">Você ainda não possui materiais adquiridos.</p>
                  <Link to="/materiais" className="btn btn-primary mt-4 inline-flex">Ver materiais disponíveis</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {materiais.map((m) => {
                    const material = typeof m.material === 'object' ? m.material : null;
                    const titulo = material?.titulo || 'Material';
                    const materialId = material?._id || m.material;
                    return (
                      <div key={m._id} className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {material?.capa ? <img src={material.capa} alt="" className="w-12 h-12 object-cover" /> : <ShoppingBag className="w-5 h-5 text-primary-500" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--color-text-primary)] truncate">{titulo}</p>
                              <p className="text-xs text-[var(--color-text-muted)] font-mono">{m.serialKey}</p>
                              {m.validade && (
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  {m.valido ? `Válido até ${new Date(m.validade).toLocaleDateString('pt-BR')}` : 'Acesso expirado'}
                                </p>
                              )}
                              {!m.validade && <p className="text-xs text-emerald-500">Acesso vitalício</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.valido ? (
                              <Link to={`/materiais/${materialId}`} className="btn btn-primary btn-sm flex items-center gap-2 text-sm">
                                <Download className="w-4 h-4" /> Acessar
                              </Link>
                            ) : (
                              <span className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500">Expirado</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Serial Key Tab */}
          {activeTab === 'serial' && (
            <div className="space-y-6">
              <div className="bg-primary-50 dark:bg-primary-500/10 p-4 rounded-lg">
                <h3 className="font-medium text-primary-800 dark:text-primary-300 mb-2">Como funciona?</h3>
                <p className="text-primary-700 dark:text-primary-300/80 text-sm">
                  Insira sua serial key para atualizar seu cargo e ter acesso completo às aulas e exercícios.
                  Cada chave pode ser utilizada apenas uma vez.
                </p>
              </div>

              <form onSubmit={handleApplySerialKey} className="space-y-4">
                <div>
                  <label className="label">Serial Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={serialKey}
                      onChange={(e) => setSerialKey(e.target.value.toUpperCase())}
                      className="input pl-10 font-mono"
                      placeholder="ECO-2025-XXXX"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isApplying}
                  className="btn btn-primary"
                >
                  {isApplying ? 'Validando...' : 'Validar Chave'}
                </button>
              </form>

              {/* History */}
              {user?.serialKeysUsadas && user.serialKeysUsadas.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Histórico de Chaves</h3>
                  <div className="space-y-2">
                    {(user.serialKeysUsadas as any[]).map((key, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg flex justify-between items-center">
                        <span className="font-mono text-sm text-[var(--color-text-primary)]">{key.chave}</span>
                        <span className="text-sm text-[var(--color-text-muted)]">
                          {key.dataUso ? new Date(key.dataUso).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notas' && (
            <div className="space-y-6">
              {isLoadingNotes ? (
                <Loading />
              ) : userNotes.length === 0 ? (
                <div className="text-center py-12">
                  <StickyNote className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                    Nenhuma nota encontrada
                  </h3>
                  <p className="text-[var(--color-text-muted)]">
                    Suas notas de aula aparecerão aqui. Crie notas durante as aulas gravadas clicando no botão "Notas".
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {userNotes.map((courseGroup) => (
                    <div key={courseGroup.cursoId} className="space-y-4">
                      {/* Course Header */}
                      <div className="flex items-center gap-2 pb-2 border-b border-[var(--glass-border)]">
                        <BookOpen className="w-5 h-5 text-primary-500" />
                        <h3 className="font-semibold text-[var(--color-text-primary)]">
                          {courseGroup.cursoTitulo}
                        </h3>
                      </div>

                      {/* Lessons */}
                      {courseGroup.lessons.map((lessonGroup) => (
                        <div key={lessonGroup.lessonId} className="ml-4 space-y-3">
                          {/* Lesson Header */}
                          <div className="flex items-center justify-between">
                            <Link
                              to={`/aulas/${lessonGroup.lessonId}`}
                              className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-primary-500 transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              {lessonGroup.lessonTitulo}
                            </Link>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {lessonGroup.notes.length} nota{lessonGroup.notes.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Notes List */}
                          <div className="space-y-2">
                            {lessonGroup.notes.map((note) => (
                              <div
                                key={note._id}
                                className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-[var(--glass-border)] hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors group"
                              >
                                <div className="flex items-start gap-3">
                                  {/* Timestamp */}
                                  <Link
                                    to={`/aulas/${lessonGroup.lessonId}?t=${note.timestamp}`}
                                    className="flex-shrink-0 px-2 py-1 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded text-xs font-mono hover:bg-primary-200 dark:hover:bg-primary-500/30 transition-colors"
                                    title="Ir para este momento"
                                  >
                                    {formatTimestamp(note.timestamp)}
                                  </Link>

                                  {/* Content */}
                                  <p className="flex-1 text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
                                    {note.conteudo}
                                  </p>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteNote(note._id)}
                                    disabled={isDeletingNote === note._id}
                                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title="Excluir nota"
                                  >
                                    {isDeletingNote === note._id ? (
                                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>

                                {/* Date */}
                                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                                  {new Date(note.createdAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="label">Senha Atual</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={passwordData.senhaAtual}
                    onChange={(e) => setPasswordData({ ...passwordData, senhaAtual: e.target.value })}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={passwordData.novaSenha}
                    onChange={(e) => setPasswordData({ ...passwordData, novaSenha: e.target.value })}
                    className="input pl-10"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={passwordData.confirmarSenha}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmarSenha: e.target.value })}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn btn-primary"
              >
                {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Serial Key Quick Modal */}
      {showSerialKeyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Usar Serial Key</h2>
                  <p className="text-white/80 text-sm">Insira sua chave para ativar o acesso</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="bg-primary-50 dark:bg-primary-500/10 p-3 rounded-lg">
                <p className="text-primary-700 dark:text-primary-300/80 text-sm">
                  Insira sua serial key para atualizar seu cargo e ter acesso completo às aulas e exercícios.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  handleApplySerialKey(e);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label">Serial Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={serialKey}
                      onChange={(e) => setSerialKey(e.target.value.toUpperCase())}
                      className="input pl-10 font-mono"
                      placeholder="ECO-2025-XXXX"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSerialKeyModal(false);
                      setSerialKey('');
                    }}
                    className="btn btn-outline flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isApplying || !serialKey.trim()}
                    className="btn btn-primary flex-1"
                  >
                    {isApplying ? 'Validando...' : 'Validar Chave'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

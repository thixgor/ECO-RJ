import React, { useState, useEffect } from 'react';
import { User, Mail, CreditCard, Calendar, Stethoscope, Key, Lock, Edit, Check, X, AlertCircle, Award, Download, Clock, BookOpen, StickyNote, Play, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService, userService, certificateService, notesService } from '../services/api';
import { Certificate, User as UserType, Course, UserNote, GroupedNotesByCourse } from '../types';
import { generateCertificatePDF } from '../utils/certificatePdfGenerator';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'serial' | 'password' | 'certificados' | 'notas'>('info');

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
  }, [activeTab]);

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
      const notes: UserNote[] = response.data || [];

      // Group notes by course and lesson
      const groupedMap = new Map<string, GroupedNotesByCourse>();

      notes.forEach(note => {
        const cursoId = typeof note.cursoId === 'string' ? note.cursoId : (note.cursoId as any)?._id;
        const cursoTitulo = typeof note.cursoId === 'object' ? (note.cursoId as any)?.titulo : 'Curso';

        if (!groupedMap.has(cursoId)) {
          groupedMap.set(cursoId, {
            cursoId,
            cursoTitulo,
            lessons: []
          });
        }

        const courseGroup = groupedMap.get(cursoId)!;
        const lessonId = typeof note.lessonId === 'string' ? note.lessonId : (note.lessonId as any)?._id;
        const lessonTitulo = typeof note.lessonId === 'object' ? (note.lessonId as any)?.titulo : 'Aula';

        let lessonGroup = courseGroup.lessons.find(l => l.lessonId === lessonId);
        if (!lessonGroup) {
          lessonGroup = {
            lessonId,
            lessonTitulo,
            notes: []
          };
          courseGroup.lessons.push(lessonGroup);
        }

        lessonGroup.notes.push(note);
      });

      // Sort notes within each lesson by timestamp
      groupedMap.forEach(course => {
        course.lessons.forEach(lesson => {
          lesson.notes.sort((a, b) => a.timestamp - b.timestamp);
        });
      });

      setUserNotes(Array.from(groupedMap.values()));
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
            notes: lesson.notes.filter(n => n._id !== noteId)
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
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${user?.cargo === 'Administrador'
                ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                : user?.cargo === 'Aluno'
                  ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                  : user?.cargo === 'Instrutor'
                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}>
              {user?.cargo}
            </span>
          </div>
          {!isEditing && (
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
          )}
        </div>
      </div>

      {/* Visitor Alert */}
      {user?.cargo === 'Visitante' && (
        <div className="bg-yellow-50 dark:bg-amber-500/10 border border-yellow-200 dark:border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-amber-400">Acesso Limitado</h3>
            <p className="text-yellow-700 dark:text-amber-300/80 text-sm mt-1">
              Você está como Visitante. Aplique uma serial key abaixo para ter acesso completo às aulas e exercícios.
            </p>
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
                  <div>
                    <label className="label">Especialidade</label>
                    <input
                      type="text"
                      value={editData.especialidade}
                      onChange={(e) => setEditData({ ...editData, especialidade: e.target.value })}
                      className="input"
                    />
                  </div>
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
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">CPF</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{formatCPF(user?.cpf || '')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">CRM</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{user?.crm}-{user?.crmLocal}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">Data de Nascimento</p>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {user?.dataNascimento
                          ? new Date(user.dataNascimento).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Stethoscope className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">Especialidade</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{user?.especialidade || 'Não informada'}</p>
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
    </div>
  );
};

export default Profile;

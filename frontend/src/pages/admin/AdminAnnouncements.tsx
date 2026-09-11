import React, { useState, useEffect } from 'react';
import { Bell, Plus, Edit2, Trash2, Eye, EyeOff, Search, AlertTriangle, Users, BookOpen, Globe, X } from 'lucide-react';
import { announcementService, courseService } from '../../services/api';
import { Announcement, Course } from '../../types';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const AdminAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterAtivo, setFilterAtivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  const [form, setForm] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'geral' as 'geral' | 'alunos' | 'curso_especifico',
    cursosAlvo: [] as string[],
    prioridade: 'normal' as 'baixa' | 'normal' | 'alta',
    dataExpiracao: ''
  });

  useEffect(() => {
    loadData();
  }, [filterTipo, filterAtivo]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [announcementsResponse, coursesResponse] = await Promise.all([
        announcementService.getAll({
          tipo: filterTipo || undefined,
          ativo: filterAtivo || undefined
        }),
        courseService.getAll()
      ]);
      setAnnouncements(announcementsResponse.data.announcements);
      setCourses(coursesResponse.data.courses || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar avisos');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      titulo: '',
      conteudo: '',
      tipo: 'geral',
      cursosAlvo: [],
      prioridade: 'normal',
      dataExpiracao: ''
    });
    setEditingAnnouncement(null);
    setCourseSearch('');
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setForm({
      titulo: announcement.titulo,
      conteudo: announcement.conteudo,
      tipo: announcement.tipo,
      cursosAlvo: announcement.cursosAlvo.map((c: any) => typeof c === 'string' ? c : c._id),
      prioridade: announcement.prioridade,
      dataExpiracao: announcement.dataExpiracao ? announcement.dataExpiracao.split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        ...form,
        cursosAlvo: form.tipo === 'curso_especifico' ? form.cursosAlvo : undefined,
        dataExpiracao: form.dataExpiracao || undefined
      };

      if (editingAnnouncement) {
        await announcementService.update(editingAnnouncement._id, data);
        toast.success('Aviso atualizado com sucesso!');
      } else {
        await announcementService.create(data);
        toast.success('Aviso criado com sucesso!');
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar aviso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await announcementService.toggle(id);
      toast.success(response.data.message);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar visibilidade');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este aviso?')) return;

    try {
      await announcementService.delete(id);
      toast.success('Aviso deletado com sucesso');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar');
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const response = await announcementService.deleteAll();
      toast.success(response.data.message);
      setShowDeleteAllModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar avisos');
    } finally {
      setIsDeleting(false);
    }
  };

  const addCourseToSelection = (courseId: string) => {
    if (!form.cursosAlvo.includes(courseId)) {
      setForm({ ...form, cursosAlvo: [...form.cursosAlvo, courseId] });
    }
    setCourseSearch('');
  };

  const removeCourseFromSelection = (courseId: string) => {
    setForm({ ...form, cursosAlvo: form.cursosAlvo.filter(id => id !== courseId) });
  };

  const filteredCourses = courses.filter(c =>
    c.titulo.toLowerCase().includes(courseSearch.toLowerCase()) &&
    !form.cursosAlvo.includes(c._id)
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      geral: 'Geral (Todos)',
      alunos: 'Alunos',
      curso_especifico: 'Cursos Especificos'
    };
    return labels[tipo] || tipo;
  };

  const getTipoBadge = (tipo: string) => {
    const styles: Record<string, string> = {
      geral: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      alunos: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
      curso_especifico: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
    };
    const icons: Record<string, React.ReactNode> = {
      geral: <Globe className="w-3 h-3" />,
      alunos: <Users className="w-3 h-3" />,
      curso_especifico: <BookOpen className="w-3 h-3" />
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${styles[tipo]}`}>
        {icons[tipo]}
        {getTipoLabel(tipo)}
      </span>
    );
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const styles: Record<string, string> = {
      baixa: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
      normal: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
      alta: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    };
    const labels: Record<string, string> = {
      baixa: 'Baixa',
      normal: 'Normal',
      alta: 'Alta'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[prioridade]}`}>
        {labels[prioridade]}
      </span>
    );
  };

  const getSelectedCourseNames = () => {
    return form.cursosAlvo.map(id => {
      const course = courses.find(c => c._id === id);
      return course?.titulo || id;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Avisos</h1>
          <p className="text-[var(--color-text-secondary)]">Gerencie os avisos exibidos no dashboard dos usuarios</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="btn bg-red-500 hover:bg-red-600 text-white"
            disabled={announcements.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            Limpar Todos
          </button>
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Novo Aviso
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="">Todos os tipos</option>
            <option value="geral">Geral (Todos)</option>
            <option value="alunos">Alunos</option>
            <option value="curso_especifico">Cursos Especificos</option>
          </select>
          <select
            value={filterAtivo}
            onChange={(e) => setFilterAtivo(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Ocultos</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <Loading />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-[var(--glass-border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Titulo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Prioridade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Data</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]">
                {announcements.map((announcement) => {
                  const cursosAlvo = announcement.cursosAlvo as Course[];
                  return (
                    <tr key={announcement._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">{announcement.titulo}</p>
                          <p className="text-sm text-[var(--color-text-muted)] line-clamp-1">{announcement.conteudo}</p>
                          {announcement.tipo === 'curso_especifico' && cursosAlvo.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cursosAlvo.map((curso) => (
                                <span
                                  key={typeof curso === 'string' ? curso : curso._id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  {typeof curso === 'string' ? curso : curso.titulo}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getTipoBadge(announcement.tipo)}
                      </td>
                      <td className="px-6 py-4">
                        {getPrioridadeBadge(announcement.prioridade)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                          announcement.ativo
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                        }`}>
                          {announcement.ativo ? (
                            <>
                              <Eye className="w-3 h-3" />
                              Visivel
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              Oculto
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                        <div>
                          <p>{formatDate(announcement.createdAt)}</p>
                          {announcement.dataExpiracao && (
                            <p className="text-xs text-orange-500">
                              Expira: {new Date(announcement.dataExpiracao).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggle(announcement._id)}
                            className={`p-2 rounded-lg transition-colors ${
                              announcement.ativo
                                ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10'
                                : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'
                            }`}
                            title={announcement.ativo ? 'Ocultar aviso' : 'Exibir aviso'}
                          >
                            {announcement.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openEditModal(announcement)}
                            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(announcement._id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {announcements.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>Nenhum aviso encontrado</p>
                <button onClick={openCreateModal} className="btn btn-primary mt-4">
                  <Plus className="w-4 h-4" />
                  Criar Primeiro Aviso
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">
                {editingAnnouncement ? 'Editar Aviso' : 'Novo Aviso'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Titulo *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="input"
                  placeholder="Titulo do aviso"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="label">Conteudo *</label>
                <textarea
                  value={form.conteudo}
                  onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                  className="input min-h-[120px] resize-y"
                  placeholder="Conteudo do aviso..."
                  required
                />
              </div>

              <div>
                <label className="label">Tipo de Aviso *</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as any, cursosAlvo: [] })}
                  className="input"
                >
                  <option value="geral">Geral - Todos os usuarios verao</option>
                  <option value="alunos">Alunos - Todos exceto Visitantes</option>
                  <option value="curso_especifico">Cursos Especificos - Apenas inscritos nos cursos selecionados</option>
                </select>
              </div>

              {/* Course Selection for curso_especifico */}
              {form.tipo === 'curso_especifico' && (
                <div>
                  <label className="label">Cursos Alvo *</label>
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">
                    Selecione os cursos cujos alunos inscritos verao este aviso
                  </p>

                  {/* Selected Courses */}
                  {form.cursosAlvo.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {getSelectedCourseNames().map((name, index) => (
                        <span
                          key={form.cursosAlvo[index]}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-sm"
                        >
                          <BookOpen className="w-4 h-4" />
                          {name}
                          <button
                            type="button"
                            onClick={() => removeCourseFromSelection(form.cursosAlvo[index])}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Course Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      className="input pl-10"
                      placeholder="Buscar curso..."
                    />
                  </div>

                  {courseSearch && filteredCourses.length > 0 && (
                    <div className="mt-2 border border-[var(--glass-border)] rounded-lg max-h-40 overflow-y-auto bg-[var(--color-bg-primary)]">
                      {filteredCourses.map((course) => (
                        <button
                          key={course._id}
                          type="button"
                          onClick={() => addCourseToSelection(course._id)}
                          className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                        >
                          <BookOpen className="w-4 h-4 text-primary-500" />
                          <span className="text-[var(--color-text-primary)]">{course.titulo}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {courseSearch && filteredCourses.length === 0 && (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-2 mt-2">
                      Nenhum curso encontrado
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prioridade</label>
                  <select
                    value={form.prioridade}
                    onChange={(e) => setForm({ ...form, prioridade: e.target.value as any })}
                    className="input"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="label">Data de Expiracao</label>
                  <input
                    type="date"
                    value={form.dataExpiracao}
                    onChange={(e) => setForm({ ...form, dataExpiracao: e.target.value })}
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Opcional. Deixe vazio para nao expirar.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || (form.tipo === 'curso_especifico' && form.cursosAlvo.length === 0)}
                  className="btn btn-primary flex-1"
                >
                  {isSubmitting ? 'Salvando...' : editingAnnouncement ? 'Atualizar' : 'Criar Aviso'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-outline flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                Limpar Todos os Avisos
              </h2>
              <p className="text-[var(--color-text-muted)] mb-2">
                Tem certeza que deseja deletar <strong className="text-red-500">{announcements.length}</strong> avisos?
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                Esta acao e irreversivel. Todos os avisos serao removidos permanentemente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
                >
                  {isDeleting ? 'Deletando...' : 'Sim, Deletar Todos'}
                </button>
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  className="btn btn-outline flex-1"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;

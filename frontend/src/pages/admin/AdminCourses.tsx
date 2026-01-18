import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BookOpen, Lock, Users, Calendar, ChevronUp, ChevronDown, GripVertical, FolderOpen, Layers, Monitor, MapPin } from 'lucide-react';
import { courseService, userService, courseTopicService, courseSubtopicService } from '../../services/api';
import { Course, User, CourseTopic, CourseSubtopic } from '../../types';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    dataInicio: '',
    imagemCapa: '',
    dataLimiteInscricao: '',
    acessoRestrito: true, // Padrão: curso restrito
    exibirDuracao: true, // Padrão: exibir duração do conteúdo
    certificadoDisponivel: true, // Padrão: certificado disponível
    emissaoCertificadoImediata: false, // Padrão: certificado requer aprovação
    tipo: 'online' as 'online' | 'presencial'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthorizedModal, setShowAuthorizedModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [authorizedUsers, setAuthorizedUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchUser, setSearchUser] = useState('');

  // Topic state
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [topics, setTopics] = useState<CourseTopic[]>([]);
  const [topicFormData, setTopicFormData] = useState({ titulo: '', descricao: '' });
  const [editingTopic, setEditingTopic] = useState<CourseTopic | null>(null);
  const [isSavingTopic, setIsSavingTopic] = useState(false);

  // Subtopic state
  const [selectedTopic, setSelectedTopic] = useState<CourseTopic | null>(null);
  const [subtopics, setSubtopics] = useState<CourseSubtopic[]>([]);
  const [subtopicFormData, setSubtopicFormData] = useState({ titulo: '', descricao: '' });
  const [editingSubtopic, setEditingSubtopic] = useState<CourseSubtopic | null>(null);
  const [isSavingSubtopic, setIsSavingSubtopic] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await courseService.getAll({ limit: 1000 });
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        titulo: course.titulo,
        descricao: course.descricao,
        dataInicio: course.dataInicio.split('T')[0],
        imagemCapa: course.imagemCapa || '',
        dataLimiteInscricao: course.dataLimiteInscricao ? course.dataLimiteInscricao.split('T')[0] : '',
        acessoRestrito: course.acessoRestrito || false,
        exibirDuracao: course.exibirDuracao !== false, // default true
        certificadoDisponivel: course.certificadoDisponivel !== false, // default true
        emissaoCertificadoImediata: course.emissaoCertificadoImediata || false,
        tipo: course.tipo || 'online'
      });
    } else {
      setEditingCourse(null);
      setFormData({ titulo: '', descricao: '', dataInicio: '', imagemCapa: '', dataLimiteInscricao: '', acessoRestrito: true, exibirDuracao: true, certificadoDisponivel: true, emissaoCertificadoImediata: false, tipo: 'online' });
    }
    setShowModal(true);
  };

  const openAuthorizedModal = async (course: Course) => {
    setSelectedCourse(course);
    try {
      const [authRes, usersRes] = await Promise.all([
        api.get(`/courses/${course._id}/authorized`),
        userService.getAll({ limit: 1000 })
      ]);
      setAuthorizedUsers(authRes.data);
      setAllUsers(usersRes.data.users);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    setShowAuthorizedModal(true);
  };

  const addAuthorizedUser = async (userId: string) => {
    if (!selectedCourse) return;
    try {
      await api.post(`/courses/${selectedCourse._id}/authorize`, { userId });
      const authRes = await api.get(`/courses/${selectedCourse._id}/authorized`);
      setAuthorizedUsers(authRes.data);
      toast.success('Aluno autorizado!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao autorizar');
    }
  };

  const removeAuthorizedUser = async (userId: string) => {
    if (!selectedCourse) return;
    try {
      await api.delete(`/courses/${selectedCourse._id}/authorize/${userId}`);
      setAuthorizedUsers(authorizedUsers.filter(u => u._id !== userId));
      toast.success('Autorização removida!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao remover');
    }
  };

  const filteredUsers = allUsers.filter(u =>
    !authorizedUsers.find(au => au._id === u._id) &&
    (u.nomeCompleto.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingCourse) {
        await courseService.update(editingCourse._id, formData);
        toast.success('Curso atualizado!');
      } else {
        await courseService.create(formData);
        toast.success('Curso criado!');
      }
      setShowModal(false);
      loadCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar curso');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este curso? Todas as aulas serão removidas.')) return;

    try {
      await courseService.delete(id);
      toast.success('Curso deletado');
      loadCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar');
    }
  };

  const handleToggleStatus = async (course: Course) => {
    try {
      await courseService.update(course._id, { ativo: !course.ativo });
      toast.success(course.ativo ? 'Curso desativado' : 'Curso ativado');
      loadCourses();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Reorder courses
  const moveCourse = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= courses.length) return;

    const newCourses = [...courses];
    [newCourses[index], newCourses[newIndex]] = [newCourses[newIndex], newCourses[index]];

    // Update local state immediately
    setCourses(newCourses);

    // Save to server
    const orders = newCourses.map((c, i) => ({ id: c._id, ordem: i }));
    try {
      await courseService.reorder(orders);
    } catch (error) {
      toast.error('Erro ao reordenar cursos');
      loadCourses(); // Reload on error
    }
  };

  // Topics management
  const openTopicsModal = async (course: Course) => {
    setSelectedCourse(course);
    try {
      const response = await courseTopicService.getByCourseAdmin(course._id);
      setTopics(response.data);
    } catch (error) {
      console.error('Erro ao carregar tópicos:', error);
      setTopics([]);
    }
    setShowTopicsModal(true);
    setTopicFormData({ titulo: '', descricao: '' });
    setEditingTopic(null);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    setIsSavingTopic(true);
    try {
      if (editingTopic) {
        await courseTopicService.update(editingTopic._id, topicFormData);
        toast.success('Tópico atualizado!');
      } else {
        await courseTopicService.create({
          ...topicFormData,
          cursoId: selectedCourse._id
        });
        toast.success('Tópico criado!');
      }
      const response = await courseTopicService.getByCourseAdmin(selectedCourse._id);
      setTopics(response.data);
      setTopicFormData({ titulo: '', descricao: '' });
      setEditingTopic(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar tópico');
    } finally {
      setIsSavingTopic(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Tem certeza que deseja deletar este tópico?')) return;
    if (!selectedCourse) return;

    try {
      await courseTopicService.delete(topicId);
      toast.success('Tópico deletado!');
      const response = await courseTopicService.getByCourseAdmin(selectedCourse._id);
      setTopics(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar tópico');
    }
  };

  const moveTopic = async (index: number, direction: 'up' | 'down') => {
    if (!selectedCourse) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= topics.length) return;

    const newTopics = [...topics];
    [newTopics[index], newTopics[newIndex]] = [newTopics[newIndex], newTopics[index]];

    setTopics(newTopics);

    const orders = newTopics.map((t, i) => ({ id: t._id, ordem: i }));
    try {
      await courseTopicService.reorder(orders);
    } catch (error) {
      toast.error('Erro ao reordenar tópicos');
      const response = await courseTopicService.getByCourseAdmin(selectedCourse._id);
      setTopics(response.data);
    }
  };

  // Subtopics management
  const openSubtopicsForTopic = async (topic: CourseTopic) => {
    setSelectedTopic(topic);
    try {
      const response = await courseSubtopicService.getByTopicAdmin(topic._id);
      setSubtopics(response.data);
    } catch (error) {
      console.error('Erro ao carregar subtópicos:', error);
      setSubtopics([]);
    }
    setSubtopicFormData({ titulo: '', descricao: '' });
    setEditingSubtopic(null);
  };

  const handleSaveSubtopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedTopic) return;

    setIsSavingSubtopic(true);
    try {
      if (editingSubtopic) {
        await courseSubtopicService.update(editingSubtopic._id, subtopicFormData);
        toast.success('Subtópico atualizado!');
      } else {
        await courseSubtopicService.create({
          ...subtopicFormData,
          cursoId: selectedCourse._id,
          topicoId: selectedTopic._id
        });
        toast.success('Subtópico criado!');
      }
      const response = await courseSubtopicService.getByTopicAdmin(selectedTopic._id);
      setSubtopics(response.data);
      setSubtopicFormData({ titulo: '', descricao: '' });
      setEditingSubtopic(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar subtópico');
    } finally {
      setIsSavingSubtopic(false);
    }
  };

  const handleDeleteSubtopic = async (subtopicId: string) => {
    if (!confirm('Tem certeza que deseja deletar este subtópico?')) return;
    if (!selectedTopic) return;

    try {
      await courseSubtopicService.delete(subtopicId);
      toast.success('Subtópico deletado!');
      const response = await courseSubtopicService.getByTopicAdmin(selectedTopic._id);
      setSubtopics(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar subtópico');
    }
  };

  const moveSubtopic = async (index: number, direction: 'up' | 'down') => {
    if (!selectedTopic) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subtopics.length) return;

    const newSubtopics = [...subtopics];
    [newSubtopics[index], newSubtopics[newIndex]] = [newSubtopics[newIndex], newSubtopics[index]];

    setSubtopics(newSubtopics);

    const orders = newSubtopics.map((s, i) => ({ id: s._id, ordem: i }));
    try {
      await courseSubtopicService.reorder(orders);
    } catch (error) {
      toast.error('Erro ao reordenar subtópicos');
      const response = await courseSubtopicService.getByTopicAdmin(selectedTopic._id);
      setSubtopics(response.data);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Gerenciar Cursos</h1>
          <p className="text-[var(--color-text-secondary)]">{courses.length} cursos cadastrados</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Novo Curso
        </button>
      </div>

      {/* Courses List */}
      <div className="card">
        {isLoading ? (
          <div className="p-8">
            <Loading />
          </div>
        ) : courses.length > 0 ? (
          <div className="divide-y divide-[var(--glass-border)]">
            {courses.map((course, index) => {
              return (
                <div key={course._id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  {/* Order arrows */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveCourse(index, 'up')}
                      disabled={index === 0}
                      className={`p-1 rounded ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50'}`}
                      title="Mover para cima"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <GripVertical className="w-4 h-4 text-gray-300 mx-auto" />
                    <button
                      onClick={() => moveCourse(index, 'down')}
                      disabled={index === courses.length - 1}
                      className={`p-1 rounded ${index === courses.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50'}`}
                      title="Mover para baixo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-20 h-20 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {course.imagemCapa ? (
                      <img src={course.imagemCapa} alt="" className="w-20 h-20 rounded-lg object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <BookOpen className="w-8 h-8 text-primary-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--color-text-primary)]">{course.titulo}</h3>
                    <p className="text-sm text-[var(--color-text-muted)] line-clamp-1">{course.descricao}</p>
                    <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-gray-400">
                      <span>Início: {formatDate(course.dataInicio)}</span>
                      <span>{(course.aulas as any[])?.length || 0} aulas</span>
                      <span className={`px-2 py-0.5 rounded ${course.ativo ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}>
                        {course.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                        course.tipo === 'presencial'
                          ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'
                          : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                      }`}>
                        {course.tipo === 'presencial' ? <MapPin className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                        {course.tipo === 'presencial' ? 'Presencial' : 'Online'}
                      </span>
                      {course.acessoRestrito && (
                        <span className="px-2 py-0.5 rounded bg-yellow-100 dark:bg-amber-500/20 text-yellow-700 dark:text-amber-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Restrito
                        </span>
                      )}
                      {course.dataLimiteInscricao && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Limite: {formatDate(course.dataLimiteInscricao)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openTopicsModal(course)}
                      className="btn btn-outline py-1 px-3 text-sm flex items-center gap-1"
                      title="Gerenciar tópicos"
                    >
                      <FolderOpen className="w-3 h-3" />
                      Tópicos
                    </button>
                    {course.acessoRestrito && (
                      <button
                        onClick={() => openAuthorizedModal(course)}
                        className="btn btn-outline py-1 px-3 text-sm flex items-center gap-1"
                        title="Gerenciar alunos autorizados"
                      >
                        <Users className="w-3 h-3" />
                        Alunos
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(course)}
                      className="btn btn-outline py-1 px-3 text-sm"
                    >
                      {course.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => openModal(course)}
                      className="p-2 text-gray-400 hover:text-primary-500"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course._id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum curso criado ainda</p>
            <button onClick={() => openModal()} className="btn btn-primary mt-4">
              Criar Primeiro Curso
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-lg">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">
                {editingCourse ? 'Editar Curso' : 'Novo Curso'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Descrição *</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="input min-h-[100px]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Data de Início *</label>
                  <input
                    type="date"
                    value={formData.dataInicio}
                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Tipo do Curso *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'online' | 'presencial' })}
                    className="input"
                  >
                    <option value="online">Online</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">URL da Imagem de Capa</label>
                <input
                  type="url"
                  value={formData.imagemCapa}
                  onChange={(e) => setFormData({ ...formData, imagemCapa: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="label">Data Limite de Inscrição</label>
                <input
                  type="date"
                  value={formData.dataLimiteInscricao}
                  onChange={(e) => setFormData({ ...formData, dataLimiteInscricao: e.target.value })}
                  className="input"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Deixe em branco para inscrições sem prazo</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-amber-500/10 rounded-lg">
                <input
                  type="checkbox"
                  id="acessoRestrito"
                  checked={formData.acessoRestrito}
                  onChange={(e) => setFormData({ ...formData, acessoRestrito: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <label htmlFor="acessoRestrito" className="font-medium text-[var(--color-text-primary)] cursor-pointer">
                    Acesso Restrito ao Conteúdo
                  </label>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Todos podem ver o curso, mas apenas alunos autorizados poderão acessar as aulas e conteúdos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                <input
                  type="checkbox"
                  id="exibirDuracao"
                  checked={formData.exibirDuracao}
                  onChange={(e) => setFormData({ ...formData, exibirDuracao: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <label htmlFor="exibirDuracao" className="font-medium text-[var(--color-text-primary)] cursor-pointer">
                    Exibir Tempo de Conteudo
                  </label>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Mostra "Xh e Ymin de conteudo" na pagina do curso e listagem
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-teal-50 dark:bg-teal-500/10 rounded-lg">
                <input
                  type="checkbox"
                  id="certificadoDisponivel"
                  checked={formData.certificadoDisponivel}
                  onChange={(e) => setFormData({ ...formData, certificadoDisponivel: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                />
                <div>
                  <label htmlFor="certificadoDisponivel" className="font-medium text-[var(--color-text-primary)] cursor-pointer">
                    Certificado Disponivel
                  </label>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Quando ativado, exibe badge "CERTIFICADO" no curso e permite emissao de certificado ao concluir
                  </p>
                </div>
              </div>
              {formData.certificadoDisponivel && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg ml-4 border-l-2 border-amber-500">
                  <input
                    type="checkbox"
                    id="emissaoCertificadoImediata"
                    checked={formData.emissaoCertificadoImediata}
                    onChange={(e) => setFormData({ ...formData, emissaoCertificadoImediata: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <label htmlFor="emissaoCertificadoImediata" className="font-medium text-[var(--color-text-primary)] cursor-pointer">
                      Emissao Imediata de Certificado
                    </label>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Quando ativado, o aluno recebe o certificado automaticamente ao concluir 100% do curso (sem necessidade de aprovacao)
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isSaving} className="btn btn-primary flex-1">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alunos Autorizados */}
      {showAuthorizedModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-2xl !max-h-[90vh] overflow-hidden flex flex-col p-0">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">
                Alunos Autorizados - {selectedCourse.titulo}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Gerencie quem pode acessar este curso restrito
              </p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* Buscar e adicionar aluno */}
              <div className="mb-6">
                <label className="label">Adicionar Aluno</label>
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="input mb-2"
                  placeholder="Buscar por nome ou email..."
                />
                {searchUser && filteredUsers.length > 0 && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {filteredUsers.slice(0, 10).map((user) => (
                      <button
                        key={user._id}
                        onClick={() => {
                          addAuthorizedUser(user._id);
                          setSearchUser('');
                        }}
                        className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">{user.nomeCompleto}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
                        </div>
                        <Plus className="w-4 h-4 text-primary-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de autorizados */}
              <div>
                <label className="label">Alunos Autorizados ({authorizedUsers.length})</label>
                {authorizedUsers.length > 0 ? (
                  <div className="space-y-2">
                    {authorizedUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">{user.nomeCompleto}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
                        </div>
                        <button
                          onClick={() => removeAuthorizedUser(user._id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Nenhum aluno autorizado ainda
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-[var(--glass-border)]">
              <button
                onClick={() => setShowAuthorizedModal(false)}
                className="btn btn-outline w-full"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Tópicos */}
      {showTopicsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-2xl !max-h-[90vh] overflow-hidden flex flex-col p-0">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">
                Tópicos - {selectedCourse.titulo}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Organize as aulas em tópicos para melhor navegação
              </p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* Formulário de novo tópico */}
              <form onSubmit={handleSaveTopic} className="mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                <h3 className="font-medium text-[var(--color-text-primary)] mb-3">
                  {editingTopic ? 'Editar Tópico' : 'Novo Tópico'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Título *</label>
                    <input
                      type="text"
                      value={topicFormData.titulo}
                      onChange={(e) => setTopicFormData({ ...topicFormData, titulo: e.target.value })}
                      className="input"
                      required
                      placeholder="Ex: Módulo 1 - Introdução"
                    />
                  </div>
                  <div>
                    <label className="label">Descrição</label>
                    <textarea
                      value={topicFormData.descricao}
                      onChange={(e) => setTopicFormData({ ...topicFormData, descricao: e.target.value })}
                      className="input min-h-[60px]"
                      placeholder="Descrição opcional do tópico..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={isSavingTopic} className="btn btn-primary">
                      {isSavingTopic ? 'Salvando...' : editingTopic ? 'Atualizar' : 'Adicionar'}
                    </button>
                    {editingTopic && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTopic(null);
                          setTopicFormData({ titulo: '', descricao: '' });
                        }}
                        className="btn btn-outline"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {/* Lista de tópicos */}
              <div>
                <label className="label">Tópicos ({topics.length})</label>
                {topics.length > 0 ? (
                  <div className="space-y-2">
                    {topics.map((topic, index) => (
                      <div key={topic._id} className="rounded-lg border border-[var(--glass-border)] overflow-hidden">
                        <div
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5"
                        >
                          {/* Order arrows */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveTopic(index, 'up')}
                              disabled={index === 0}
                              className={`p-0.5 rounded ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-primary-500'}`}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveTopic(index, 'down')}
                              disabled={index === topics.length - 1}
                              className={`p-0.5 rounded ${index === topics.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-primary-500'}`}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="relative">
                            <FolderOpen className="w-5 h-5 text-primary-500" />
                            {topic.totalAulas !== undefined && (
                              <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {topic.totalAulas}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--color-text-primary)]">{topic.titulo}</p>
                            {topic.descricao && (
                              <p className="text-sm text-[var(--color-text-muted)] line-clamp-1">{topic.descricao}</p>
                            )}
                          </div>

                          <span className={`px-2 py-0.5 rounded text-xs ${topic.ativo ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                            }`}>
                            {topic.ativo ? 'Ativo' : 'Inativo'}
                          </span>

                          <button
                            onClick={() => openSubtopicsForTopic(topic)}
                            className={`p-2 rounded transition-colors ${selectedTopic?._id === topic._id ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-500' : 'text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                            title="Gerenciar subtópicos"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTopic(topic);
                              setTopicFormData({ titulo: topic.titulo, descricao: topic.descricao || '' });
                            }}
                            className="p-2 text-gray-400 hover:text-primary-500"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(topic._id)}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Subtopics section (expandido quando tópico selecionado) */}
                        {selectedTopic?._id === topic._id && (
                          <div className="p-4 bg-gray-100/50 dark:bg-white/[0.02] border-t border-[var(--glass-border)]">
                            <div className="mb-4">
                              <h4 className="font-medium text-sm text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-primary-500" />
                                Subtópicos de "{topic.titulo}"
                              </h4>

                              {/* Formulário de subtópico */}
                              <form onSubmit={handleSaveSubtopic} className="mb-3 p-3 bg-white dark:bg-white/5 rounded-lg border border-[var(--glass-border)]">
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={subtopicFormData.titulo}
                                    onChange={(e) => setSubtopicFormData({ ...subtopicFormData, titulo: e.target.value })}
                                    className="input text-sm py-2"
                                    required
                                    placeholder="Título do subtópico..."
                                  />
                                  <input
                                    type="text"
                                    value={subtopicFormData.descricao}
                                    onChange={(e) => setSubtopicFormData({ ...subtopicFormData, descricao: e.target.value })}
                                    className="input text-sm py-2"
                                    placeholder="Descrição (opcional)..."
                                  />
                                  <div className="flex gap-2">
                                    <button type="submit" disabled={isSavingSubtopic} className="btn btn-primary py-1.5 px-3 text-sm">
                                      {isSavingSubtopic ? 'Salvando...' : editingSubtopic ? 'Atualizar' : 'Adicionar'}
                                    </button>
                                    {editingSubtopic && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSubtopic(null);
                                          setSubtopicFormData({ titulo: '', descricao: '' });
                                        }}
                                        className="btn btn-outline py-1.5 px-3 text-sm"
                                      >
                                        Cancelar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </form>

                              {/* Lista de subtópicos */}
                              {subtopics.length > 0 ? (
                                <div className="space-y-1">
                                  {subtopics.map((subtopic, subIndex) => (
                                    <div
                                      key={subtopic._id}
                                      className="flex items-center gap-2 p-2 bg-white dark:bg-white/5 rounded-lg border border-[var(--glass-border)]"
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <button
                                          onClick={() => moveSubtopic(subIndex, 'up')}
                                          disabled={subIndex === 0}
                                          className={`p-0.5 rounded ${subIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-primary-500'}`}
                                        >
                                          <ChevronUp className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={() => moveSubtopic(subIndex, 'down')}
                                          disabled={subIndex === subtopics.length - 1}
                                          className={`p-0.5 rounded ${subIndex === subtopics.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-primary-500'}`}
                                        >
                                          <ChevronDown className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                      <Layers className="w-4 h-4 text-amber-500" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{subtopic.titulo}</p>
                                        {subtopic.descricao && (
                                          <p className="text-xs text-[var(--color-text-muted)]">{subtopic.descricao}</p>
                                        )}
                                      </div>
                                      {subtopic.totalAulas !== undefined && subtopic.totalAulas > 0 && (
                                        <span className="text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                          {subtopic.totalAulas} aulas
                                        </span>
                                      )}
                                      <button
                                        onClick={() => {
                                          setEditingSubtopic(subtopic);
                                          setSubtopicFormData({ titulo: subtopic.titulo, descricao: subtopic.descricao || '' });
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-primary-500"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubtopic(subtopic._id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-[var(--color-text-muted)] text-center py-3">
                                  Nenhum subtópico criado ainda
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum tópico criado ainda</p>
                    <p className="text-sm">Crie tópicos para organizar as aulas deste curso</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-[var(--glass-border)]">
              <button
                onClick={() => {
                  setShowTopicsModal(false);
                  setEditingTopic(null);
                  setTopicFormData({ titulo: '', descricao: '' });
                }}
                className="btn btn-outline w-full"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;

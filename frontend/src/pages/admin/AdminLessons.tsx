import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, PlayCircle, Clock, Video, ExternalLink, X, ChevronUp, ChevronDown, FolderOpen, GripVertical, FileText, Layers, Zap } from 'lucide-react';
import { lessonService, courseService, courseTopicService, courseSubtopicService } from '../../services/api';
import { Lesson, Course, CustomButton, CourseTopic, CourseSubtopic } from '../../types';
import Loading from '../../components/common/Loading';
import { GlassCard, GlassButton, GlassInput, GlassSelect, GlassBadge } from '../../components/ui';
import { detectVideoDuration } from '../../utils/videoUtils';
import { formatDuration } from '../../utils/formatDuration';
import toast from 'react-hot-toast';

// Ícones disponíveis para botões personalizados
const AVAILABLE_ICONS = [
  { value: 'link', label: 'Link' },
  { value: 'download', label: 'Download' },
  { value: 'file', label: 'Arquivo' },
  { value: 'book', label: 'Livro' },
  { value: 'video', label: 'Vídeo' },
  { value: 'music', label: 'Áudio' },
  { value: 'image', label: 'Imagem' },
  { value: 'globe', label: 'Website' },
  { value: 'github', label: 'GitHub' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'drive', label: 'Google Drive' },
  { value: 'pdf', label: 'PDF' },
  { value: 'presentation', label: 'Apresentação' },
  { value: 'folder', label: 'Pasta' },
  { value: 'calendar', label: 'Calendário' },
  { value: 'message', label: 'Mensagem' },
  { value: 'heart', label: 'Favorito' },
  { value: 'star', label: 'Destaque' },
];

const AdminLessons: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<CourseTopic[]>([]);
  const [allSubtopics, setAllSubtopics] = useState<CourseSubtopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [filterCurso, setFilterCurso] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterSubtopic, setFilterSubtopic] = useState('');

  // Topic creation state within modal
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  // Subtopic creation state within modal
  const [showNewSubtopicForm, setShowNewSubtopicForm] = useState(false);
  const [newSubtopicTitle, setNewSubtopicTitle] = useState('');
  const [isCreatingSubtopic, setIsCreatingSubtopic] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'gravada' as 'ao_vivo' | 'gravada' | 'material',
    embedVideo: '',
    dataHoraInicio: '',
    duracao: 0,
    cargosPermitidos: ['Aluno', 'Administrador'] as string[],
    cursoId: '',
    topicoId: '',
    subtopicoId: '',
    notasAula: '',
    botoesPersonalizados: [] as CustomButton[],
    zoomMeetingId: '',
    zoomMeetingPassword: ''
  });

  // Estado para novo botão
  const [novoButton, setNovoButton] = useState<CustomButton>({
    nome: '',
    icone: 'link',
    url: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingDuration, setIsDetectingDuration] = useState(false);

  // Função para detectar duração automaticamente
  const handleDetectDuration = async () => {
    if (!formData.embedVideo.trim()) {
      toast.error('Cole o link ou embed do vídeo primeiro');
      return;
    }

    setIsDetectingDuration(true);
    try {
      const duration = await detectVideoDuration(formData.embedVideo);
      if (duration) {
        setFormData({ ...formData, duracao: duration });
        toast.success(`Duração detectada: ${duration} minutos!`);
      } else {
        toast.error('Não foi possível detectar a duração automaticamente. Insira manualmente.');
      }
    } catch (error) {
      toast.error('Erro ao detectar duração do vídeo');
    } finally {
      setIsDetectingDuration(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterCurso, filterTopic, filterSubtopic]);

  useEffect(() => {
    // Load topics when filter course changes
    if (filterCurso) {
      loadTopics(filterCurso);
      loadAllSubtopics(filterCurso);
    } else {
      setTopics([]);
      setAllSubtopics([]);
      setFilterTopic('');
      setFilterSubtopic('');
    }
  }, [filterCurso]);

  useEffect(() => {
    // Reset subtopic filter when topic filter changes
    setFilterSubtopic('');
  }, [filterTopic]);

  const loadData = async () => {
    try {
      const [lessonsResponse, coursesResponse] = await Promise.all([
        lessonService.getAll({
          cursoId: filterCurso || undefined,
          topicoId: filterTopic || undefined,
          subtopicoId: filterSubtopic || undefined
        }),
        courseService.getAll()
      ]);
      setLessons(lessonsResponse.data.lessons);
      setCourses(coursesResponse.data.courses);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTopics = async (courseId: string) => {
    try {
      const response = await courseTopicService.getByCourseAdmin(courseId);
      setTopics(response.data);
    } catch (error) {
      console.error('Erro ao carregar tópicos:', error);
      setTopics([]);
    }
  };

  const loadAllSubtopics = async (courseId: string) => {
    try {
      const response = await courseSubtopicService.getByCourseAdmin(courseId);
      setAllSubtopics(response.data);
    } catch (error) {
      console.error('Erro ao carregar subtópicos:', error);
      setAllSubtopics([]);
    }
  };

  // Form topics for selected course
  const [formTopics, setFormTopics] = useState<CourseTopic[]>([]);
  const [formSubtopics, setFormSubtopics] = useState<CourseSubtopic[]>([]);

  const loadFormTopics = async (courseId: string) => {
    try {
      const response = await courseTopicService.getByCourseAdmin(courseId);
      setFormTopics(response.data);
      setFormSubtopics([]);
    } catch (error) {
      setFormTopics([]);
      setFormSubtopics([]);
    }
  };

  const loadFormSubtopics = async (topicId: string) => {
    try {
      const response = await courseSubtopicService.getByTopicAdmin(topicId);
      setFormSubtopics(response.data);
    } catch (error) {
      setFormSubtopics([]);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicTitle.trim() || !formData.cursoId) return;

    setIsCreatingTopic(true);
    try {
      const response = await courseTopicService.create({
        titulo: newTopicTitle,
        cursoId: formData.cursoId
      });
      toast.success('Tópico criado!');
      // Auto-aplicar o tópico criado à aula
      setFormData({ ...formData, topicoId: response.data._id, subtopicoId: '' });
      setNewTopicTitle('');
      setShowNewTopicForm(false);
      await loadFormTopics(formData.cursoId);
      await loadFormSubtopics(response.data._id);
      // Also refresh main topics list if filtering by same course
      if (filterCurso === formData.cursoId) {
        await loadTopics(filterCurso);
      }
    } catch (error) {
      toast.error('Erro ao criar tópico');
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleCreateSubtopic = async () => {
    if (!newSubtopicTitle.trim() || !formData.cursoId || !formData.topicoId) return;

    setIsCreatingSubtopic(true);
    try {
      const response = await courseSubtopicService.create({
        titulo: newSubtopicTitle,
        cursoId: formData.cursoId,
        topicoId: formData.topicoId
      });
      toast.success('Subtópico criado!');
      // Auto-aplicar o subtópico criado à aula
      setFormData({ ...formData, subtopicoId: response.data._id });
      setNewSubtopicTitle('');
      setShowNewSubtopicForm(false);
      await loadFormSubtopics(formData.topicoId);
      // Also refresh main subtopics list if filtering by same course
      if (filterCurso === formData.cursoId) {
        await loadAllSubtopics(filterCurso);
      }
    } catch (error) {
      toast.error('Erro ao criar subtópico');
    } finally {
      setIsCreatingSubtopic(false);
    }
  };

  const openModal = async (lesson?: Lesson) => {
    setShowNewTopicForm(false);
    setShowNewSubtopicForm(false);
    setNewTopicTitle('');
    setNewSubtopicTitle('');

    if (lesson) {
      setEditingLesson(lesson);
      const courseId = typeof lesson.cursoId === 'string' ? lesson.cursoId : lesson.cursoId._id;
      const topicoId = (lesson as any).topicoId?._id || (lesson as any).topicoId || '';
      const subtopicoId = (lesson as any).subtopicoId?._id || (lesson as any).subtopicoId || '';
      setFormData({
        titulo: lesson.titulo,
        descricao: lesson.descricao || '',
        tipo: lesson.tipo,
        embedVideo: lesson.embedVideo || '',
        dataHoraInicio: lesson.dataHoraInicio ? convertFromISO(lesson.dataHoraInicio) : '',
        duracao: lesson.duracao || 0,
        cargosPermitidos: lesson.cargosPermitidos,
        cursoId: courseId,
        topicoId: topicoId,
        subtopicoId: subtopicoId,
        notasAula: lesson.notasAula || '',
        botoesPersonalizados: lesson.botoesPersonalizados || [],
        zoomMeetingId: lesson.zoomMeetingId || '',
        zoomMeetingPassword: lesson.zoomMeetingPassword || ''
      });
      await loadFormTopics(courseId);
      if (topicoId) {
        await loadFormSubtopics(topicoId);
      }
    } else {
      setEditingLesson(null);
      const defaultCourseId = filterCurso || (courses[0]?._id || '');
      setFormData({
        titulo: '',
        descricao: '',
        tipo: 'gravada',
        embedVideo: '',
        dataHoraInicio: '',
        duracao: 0,
        cargosPermitidos: ['Aluno', 'Administrador'],
        cursoId: defaultCourseId,
        topicoId: filterTopic === 'null' ? '' : filterTopic,
        subtopicoId: '',
        notasAula: '',
        botoesPersonalizados: [],
        zoomMeetingId: '',
        zoomMeetingPassword: ''
      });
      if (defaultCourseId) {
        await loadFormTopics(defaultCourseId);
      }
    }
    setNovoButton({ nome: '', icone: 'link', url: '' });
    setShowModal(true);
  };

  const handleCourseChange = async (courseId: string) => {
    setFormData({ ...formData, cursoId: courseId, topicoId: '', subtopicoId: '' });
    setFormSubtopics([]);
    await loadFormTopics(courseId);
  };

  const handleTopicChange = async (topicId: string) => {
    setFormData({ ...formData, topicoId: topicId, subtopicoId: '' });
    if (topicId) {
      await loadFormSubtopics(topicId);
    } else {
      setFormSubtopics([]);
    }
  };

  // Converter datetime-local para ISO string com timezone de Brasília explícito
  // O datetime-local retorna "2026-01-11T16:00" sem timezone
  // Precisamos interpretar isso como horário de Brasília e converter para UTC
  const convertToISO = (datetimeLocal: string): string => {
    if (!datetimeLocal) return '';
    // Adicionar o offset de Brasília (-03:00) explicitamente
    // Isso garante que 16:00 Brasília seja salvo como 19:00 UTC
    return new Date(datetimeLocal + ':00-03:00').toISOString();
  };

  // Converter ISO (UTC) para datetime-local em horário de Brasília
  const convertFromISO = (isoString: string): string => {
    if (!isoString) return '';
    // Usar toLocaleString para obter o horário em Brasília
    const date = new Date(isoString);
    const brasilDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const year = brasilDate.getFullYear();
    const month = String(brasilDate.getMonth() + 1).padStart(2, '0');
    const day = String(brasilDate.getDate()).padStart(2, '0');
    const hours = String(brasilDate.getHours()).padStart(2, '0');
    const minutes = String(brasilDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Converter dataHoraInicio para ISO se for aula ao vivo
      const dataHoraInicioISO = formData.tipo === 'ao_vivo' && formData.dataHoraInicio
        ? convertToISO(formData.dataHoraInicio)
        : undefined;

      if (editingLesson) {
        const updateData = {
          ...formData,
          dataHoraInicio: dataHoraInicioISO,
          duracao: formData.duracao > 0 ? formData.duracao : 0,
          embedVideo: formData.embedVideo || undefined,
          topicoId: formData.topicoId || null,
          subtopicoId: formData.subtopicoId || null
        };
        await lessonService.update(editingLesson._id, updateData);
        toast.success('Aula atualizada!');
      } else {
        const createData = {
          ...formData,
          dataHoraInicio: dataHoraInicioISO,
          duracao: formData.duracao || 0,
          embedVideo: formData.embedVideo || '',
          topicoId: formData.topicoId || undefined,
          subtopicoId: formData.subtopicoId || undefined
        };
        await lessonService.create(createData);
        toast.success('Aula criada!');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar aula');
    } finally {
      setIsSaving(false);
    }
  };

  // Reorder lessons
  const moveLesson = async (lessonToMove: Lesson, direction: 'up' | 'down') => {
    // Reordering logic when items might be grouped
    const currentList = [...lessons];
    const index = currentList.findIndex(l => l._id === lessonToMove._id);
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= currentList.length) return;

    // Local swap
    [currentList[index], currentList[newIndex]] = [currentList[newIndex], currentList[index]];
    setLessons(currentList);

    // Prepare orders update
    const orders = currentList.map((l, i) => ({
      id: l._id,
      ordem: i,
      topicoId: (l as any).topicoId?._id || (l as any).topicoId || null,
      subtopicoId: (l as any).subtopicoId?._id || (l as any).subtopicoId || null
    }));

    try {
      await lessonService.reorder(orders);
    } catch (error) {
      toast.error('Erro ao reordenar aulas');
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta aula?')) return;

    try {
      await lessonService.delete(id);
      toast.success('Aula deletada');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar');
    }
  };

  const toggleCargo = (cargo: string) => {
    setFormData(prev => ({
      ...prev,
      cargosPermitidos: prev.cargosPermitidos.includes(cargo)
        ? prev.cargosPermitidos.filter(c => c !== cargo)
        : [...prev.cargosPermitidos, cargo]
    }));
  };

  const adicionarBotao = () => {
    if (!novoButton.nome || !novoButton.url) {
      toast.error('Preencha o nome e URL do botão');
      return;
    }
    setFormData(prev => ({
      ...prev,
      botoesPersonalizados: [...prev.botoesPersonalizados, { ...novoButton }]
    }));
    setNovoButton({ nome: '', icone: 'link', url: '' });
  };

  const removerBotao = (index: number) => {
    setFormData(prev => ({
      ...prev,
      botoesPersonalizados: prev.botoesPersonalizados.filter((_, i) => i !== index)
    }));
  };

  // Rendering a single lesson row
  const renderLessonRow = (lesson: Lesson, isFirst: boolean, isLast: boolean) => {
    const curso = lesson.cursoId as Course;
    const topico = (lesson as any).topicoId as CourseTopic | undefined;
    const subtopico = (lesson as any).subtopicoId as CourseSubtopic | undefined;

    return (
      <div key={lesson._id} className="p-4 flex items-center gap-4 hover:bg-[var(--glass-bg)] transition-colors">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => moveLesson(lesson, 'up')}
            disabled={isFirst}
            className={`p-1 rounded ${isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50'}`}
            title="Mover para cima"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <GripVertical className="w-4 h-4 text-gray-300 mx-auto" />
          <button
            onClick={() => moveLesson(lesson, 'down')}
            disabled={isLast}
            className={`p-1 rounded ${isLast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50'}`}
            title="Mover para baixo"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${lesson.tipo === 'ao_vivo'
          ? 'bg-gradient-to-br from-red-400/20 to-red-600/20'
          : lesson.tipo === 'material'
            ? 'bg-gradient-to-br from-purple-400/20 to-purple-600/20'
            : 'bg-gradient-to-br from-blue-400/20 to-blue-600/20'
          }`}>
          {lesson.tipo === 'ao_vivo' ? (
            <Video className="w-6 h-6 text-red-500" />
          ) : lesson.tipo === 'material' ? (
            <FileText className="w-6 h-6 text-purple-500" />
          ) : (
            <PlayCircle className="w-6 h-6 text-blue-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[var(--color-text-primary)]">{lesson.titulo}</h3>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>{curso?.titulo || 'Curso'}</span>
            {!filterCurso && topico && (
              <>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1 text-primary-500">
                  <FolderOpen className="w-3 h-3" />
                  {topico.titulo}
                </span>
                {subtopico && (
                  <>
                    <span className="text-gray-400">/</span>
                    <span className="flex items-center gap-1 text-amber-500">
                      <Layers className="w-3 h-3" />
                      {subtopico.titulo}
                    </span>
                  </>
                )}
              </>
            )}
            {filterCurso && subtopico && (
              <>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1 text-amber-500">
                  <Layers className="w-3 h-3" />
                  {subtopico.titulo}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <GlassBadge
              variant={lesson.tipo === 'ao_vivo' ? 'danger' : lesson.tipo === 'material' ? 'warning' : 'info'}
              size="sm"
            >
              {lesson.tipo === 'ao_vivo' ? 'Ao Vivo' : lesson.tipo === 'material' ? 'Material' : 'Gravada'}
            </GlassBadge>
            {lesson.duracao && lesson.duracao > 0 && (
              <GlassBadge variant="default" size="sm">
                <Clock className="w-3 h-3" />
                {formatDuration(lesson.duracao)}
              </GlassBadge>
            )}
            <GlassBadge
              variant={lesson.status === 'ativa' ? 'success' : lesson.status === 'expirada' ? 'default' : 'warning'}
              size="sm"
            >
              {lesson.status}
            </GlassBadge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal(lesson)}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-primary-500 hover:bg-[var(--glass-bg)] transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(lesson._id)}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Group lessons by topic and subtopic for display
  const lessonsWithoutTopic = lessons.filter(l => !(l as any).topicoId);
  const lessonsByTopicSubtopic = topics.map(topic => {
    const topicLessons = lessons.filter(l => {
      const tid = (l as any).topicoId;
      return tid && (typeof tid === 'string' ? tid === topic._id : tid._id === topic._id);
    });

    const topicSubtopics = allSubtopics.filter(s => {
      const tid = typeof s.topicoId === 'string' ? s.topicoId : s.topicoId._id;
      return tid === topic._id;
    });

    return {
      topic,
      lessonsNotInSubtopic: topicLessons.filter(l => !(l as any).subtopicoId),
      subtopics: topicSubtopics.map(subtopic => ({
        subtopic,
        lessons: topicLessons.filter(l => {
          const sid = (l as any).subtopicoId;
          return sid && (typeof sid === 'string' ? sid === subtopic._id : sid._id === subtopic._id);
        })
      }))
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Gerenciar Aulas</h1>
          <p className="text-[var(--color-text-muted)]">{lessons.length} aulas cadastradas</p>
        </div>
        <GlassButton onClick={() => openModal()} variant="primary" disabled={courses.length === 0}>
          <Plus className="w-4 h-4" />
          Nova Aula
        </GlassButton>
      </div>

      <GlassCard hover={false} padding="md">
        <div className="flex flex-wrap gap-4">
          <GlassSelect
            value={filterCurso}
            onChange={(e) => setFilterCurso(e.target.value)}
            options={[
              { value: '', label: 'Todos os cursos' },
              ...courses.map(course => ({ value: course._id, label: course.titulo }))
            ]}
            className="w-full md:w-64"
          />
          {filterCurso && topics.length > 0 && (
            <GlassSelect
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              options={[
                { value: '', label: 'Todos os tópicos' },
                { value: 'null', label: 'Sem tópico' },
                ...topics.map(topic => ({ value: topic._id, label: topic.titulo }))
              ]}
              className="w-full md:w-64"
            />
          )}
          {filterTopic && filterTopic !== 'null' && allSubtopics.filter(s => (typeof s.topicoId === 'string' ? s.topicoId : s.topicoId._id) === filterTopic).length > 0 && (
            <GlassSelect
              value={filterSubtopic}
              onChange={(e) => setFilterSubtopic(e.target.value)}
              options={[
                { value: '', label: 'Todos os subtópicos' },
                { value: 'null', label: 'Sem subtópico' },
                ...allSubtopics
                  .filter(s => (typeof s.topicoId === 'string' ? s.topicoId : s.topicoId._id) === filterTopic)
                  .map(subtopic => ({ value: subtopic._id, label: subtopic.titulo }))
              ]}
              className="w-full md:w-64"
            />
          )}
        </div>
      </GlassCard>

      <GlassCard hover={false} padding="none">
        {isLoading ? (
          <div className="p-8">
            <Loading />
          </div>
        ) : lessons.length > 0 ? (
          <div className="divide-y divide-[var(--glass-border)]">
            {/* If a course is selected and no specific topic filter, show grouped view */}
            {filterCurso && !filterTopic ? (
              <>
                {/* Lessons without topic */}
                {lessonsWithoutTopic.length > 0 && (
                  <div className="bg-gray-50/30 dark:bg-white/[0.02]">
                    <div className="px-4 py-2 border-b border-[var(--glass-border)] bg-gray-100/50 dark:bg-white/5">
                      <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider italic">
                        Aulas fora de tópicos
                      </span>
                    </div>
                    <div className="divide-y divide-[var(--glass-border)]">
                      {lessonsWithoutTopic.map((lesson, idx) =>
                        renderLessonRow(lesson, idx === 0 && !topics.length, idx === lessonsWithoutTopic.length - 1 && lessons.length === lessonsWithoutTopic.length)
                      )}
                    </div>
                  </div>
                )}

                {/* Topics and their lessons / subtopics */}
                {lessonsByTopicSubtopic.map(({ topic, lessonsNotInSubtopic, subtopics }) => (
                  <div key={topic._id}>
                    <div className="px-4 py-3 border-b border-[var(--glass-border)] bg-primary-500/5 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary-500" />
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {topic.titulo}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                        {lessonsNotInSubtopic.length + subtopics.reduce((acc, s) => acc + s.lessons.length, 0)} aulas
                      </span>
                    </div>

                    {/* Lessons in topic but NOT in subtopic */}
                    {lessonsNotInSubtopic.length > 0 && (
                      <div className="divide-y divide-[var(--glass-border)] nesting-container">
                        {lessonsNotInSubtopic.map((lesson) => {
                          const overallIdx = lessons.findIndex(l => l._id === lesson._id);
                          return renderLessonRow(lesson, overallIdx === 0, overallIdx === lessons.length - 1);
                        })}
                      </div>
                    )}

                    {/* Subtopics and their lessons */}
                    {subtopics.map(({ subtopic, lessons: subtopicLessons }) => (
                      <div key={subtopic._id} className="ml-4 border-l-2 border-amber-500/20">
                        <div className="px-4 py-2 border-b border-[var(--glass-border)] bg-amber-500/5 flex items-center gap-2">
                          <Layers className="w-3 h-3 text-amber-500" />
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {subtopic.titulo}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                            {subtopicLessons.length} aulas
                          </span>
                        </div>
                        {subtopicLessons.length > 0 ? (
                          <div className="divide-y divide-[var(--glass-border)]">
                            {subtopicLessons.map((lesson) => {
                              const overallIdx = lessons.findIndex(l => l._id === lesson._id);
                              return renderLessonRow(lesson, overallIdx === 0, overallIdx === lessons.length - 1);
                            })}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-xs text-[var(--color-text-muted)] italic">
                            Nenhuma aula neste subtópico
                          </div>
                        )}
                      </div>
                    ))}

                    {lessonsNotInSubtopic.length === 0 && subtopics.length === 0 && (
                      <div className="p-4 text-center text-sm text-[var(--color-text-muted)] italic">
                        Nenhuma aula neste tópico
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              /* Flat list view */
              lessons.map((lesson, index) => renderLessonRow(lesson, index === 0, index === lessons.length - 1))
            )}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--glass-bg)] flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[var(--color-text-muted)] mb-4">Nenhuma aula encontrada</p>
            {courses.length > 0 && (
              <GlassButton onClick={() => openModal()} variant="primary">
                Criar Nova Aula
              </GlassButton>
            )}
          </div>
        )}
      </GlassCard>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-card-static w-full max-w-3xl my-8 animate-scale-in">
            <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">
                {editingLesson ? 'Editar Aula' : 'Nova Aula'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Título e Curso */}
              <div className="grid md:grid-cols-2 gap-4">
                <GlassInput
                  label="Título *"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                />
                <GlassSelect
                  label="Curso *"
                  value={formData.cursoId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  options={courses.map(course => ({ value: course._id, label: course.titulo }))}
                  placeholder="Selecione um curso"
                />
              </div>

              {/* Tópico with Creation */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <GlassSelect
                        label="Tópico (opcional)"
                        value={formData.topicoId}
                        onChange={(e) => handleTopicChange(e.target.value)}
                        options={[
                          { value: '', label: 'Sem tópico (aula fora de tópico)' },
                          ...formTopics.map(topic => ({ value: topic._id, label: topic.titulo }))
                        ]}
                      />
                    </div>
                    {!showNewTopicForm && (
                      <GlassButton
                        type="button"
                        variant="secondary"
                        onClick={() => setShowNewTopicForm(true)}
                        className="mb-0.5"
                      >
                        <Plus className="w-4 h-4" />
                      </GlassButton>
                    )}
                  </div>

                  {showNewTopicForm && (
                    <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl space-y-3 animate-slide-down">
                      <p className="text-sm font-medium text-primary-500">Novo Tópico para este Curso</p>
                      <div className="flex gap-2">
                        <GlassInput
                          placeholder="Título do novo tópico"
                          value={newTopicTitle}
                          onChange={(e) => setNewTopicTitle(e.target.value)}
                          className="flex-1"
                        />
                        <GlassButton
                          type="button"
                          variant="primary"
                          onClick={handleCreateTopic}
                          isLoading={isCreatingTopic}
                          disabled={!newTopicTitle.trim()}
                        >
                          Criar
                        </GlassButton>
                        <GlassButton
                          type="button"
                          onClick={() => {
                            setShowNewTopicForm(false);
                            setNewTopicTitle('');
                          }}
                        >
                          <X className="w-4 h-4" />
                        </GlassButton>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtópico Selection */}
                <div className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <GlassSelect
                        label="Subtópico (opcional)"
                        value={formData.subtopicoId}
                        onChange={(e) => setFormData({ ...formData, subtopicoId: e.target.value })}
                        options={[
                          { value: '', label: 'Sem subtópico' },
                          ...formSubtopics.map(subtopic => ({ value: subtopic._id, label: subtopic.titulo }))
                        ]}
                        disabled={!formData.topicoId}
                      />
                    </div>
                    {formData.topicoId && !showNewSubtopicForm && (
                      <GlassButton
                        type="button"
                        variant="secondary"
                        onClick={() => setShowNewSubtopicForm(true)}
                        className="mb-0.5"
                      >
                        <Plus className="w-4 h-4" />
                      </GlassButton>
                    )}
                  </div>

                  {showNewSubtopicForm && formData.topicoId && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3 animate-slide-down">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Novo Subtópico para o Tópico Selecionado</p>
                      <div className="flex gap-2">
                        <GlassInput
                          placeholder="Título do novo subtópico"
                          value={newSubtopicTitle}
                          onChange={(e) => setNewSubtopicTitle(e.target.value)}
                          className="flex-1"
                        />
                        <GlassButton
                          type="button"
                          variant="primary"
                          onClick={handleCreateSubtopic}
                          isLoading={isCreatingSubtopic}
                          disabled={!newSubtopicTitle.trim()}
                        >
                          Criar
                        </GlassButton>
                        <GlassButton
                          type="button"
                          onClick={() => {
                            setShowNewSubtopicForm(false);
                            setNewSubtopicTitle('');
                          }}
                        >
                          <X className="w-4 h-4" />
                        </GlassButton>
                      </div>
                    </div>
                  )}

                  {!formData.topicoId && (
                    <p className="text-[10px] text-[var(--color-text-muted)] italic">
                      Selecione um tópico primeiro para listar subtópicos
                    </p>
                  )}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="label">Descrição (Opcional)</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="glass-input min-h-[80px]"
                  placeholder="Adicione uma descrição para a aula (opcional)"
                />
              </div>

              {/* Tipo e Duração */}
              <div className="grid md:grid-cols-2 gap-4">
                <GlassSelect
                  label="Tipo *"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'ao_vivo' | 'gravada' | 'material' })}
                  options={[
                    { value: 'gravada', label: 'Gravada' },
                    { value: 'ao_vivo', label: 'Ao Vivo' },
                    { value: 'material', label: 'Material' }
                  ]}
                />
                <GlassInput
                  label="Duração (minutos)"
                  type="number"
                  min="0"
                  value={formData.duracao || ''}
                  onChange={(e) => setFormData({ ...formData, duracao: parseInt(e.target.value) || 0 })}
                  helperText="Opcional - deixe 0 se não souber"
                />
              </div>

              {/* Data/Hora para Ao Vivo */}
              {formData.tipo === 'ao_vivo' && (
                <GlassInput
                  label="Data/Hora de Início"
                  type="datetime-local"
                  value={formData.dataHoraInicio}
                  onChange={(e) => setFormData({ ...formData, dataHoraInicio: e.target.value })}
                />
              )}

              {/* Embed Video */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label !mb-0">Embed do Vídeo (opcional)</label>
                  {formData.embedVideo.trim() && (
                    <button
                      type="button"
                      onClick={handleDetectDuration}
                      disabled={isDetectingDuration}
                      className="text-xs btn btn-outline py-1 px-2 flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      {isDetectingDuration ? 'Detectando...' : 'Detectar Duração'}
                    </button>
                  )}
                </div>
                <textarea
                  value={formData.embedVideo}
                  onChange={(e) => setFormData({ ...formData, embedVideo: e.target.value })}
                  className="glass-input min-h-[80px] font-mono text-sm"
                  placeholder="https://www.youtube.com/watch?v=... ou <iframe>...</iframe>"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Deixe em branco se não houver vídeo para esta aula. Suporta YouTube e Vimeo.
                </p>
              </div>

              {/* Seção Integração Zoom - Apenas para aulas ao vivo */}
              {formData.tipo === 'ao_vivo' && (
                <div className="border-t border-[var(--glass-border)] pt-6 mt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Video className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-[var(--color-text-primary)]">
                      Integração com Zoom (Opcional)
                    </h3>
                  </div>

                  <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Configure uma reunião Zoom existente para esta aula. Os alunos poderão entrar diretamente pela plataforma.
                    </p>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Meeting ID
                      </label>
                      <GlassInput
                        type="text"
                        value={formData.zoomMeetingId}
                        onChange={(e) => setFormData({ ...formData, zoomMeetingId: e.target.value })}
                        placeholder="Ex: 123 456 7890"
                        maxLength={13}
                      />
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        ID da reunião Zoom (9-11 dígitos). Deixe em branco para não usar Zoom.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Senha da Reunião (Opcional)
                      </label>
                      <GlassInput
                        type="text"
                        value={formData.zoomMeetingPassword}
                        onChange={(e) => setFormData({ ...formData, zoomMeetingPassword: e.target.value })}
                        placeholder="Senha da reunião (se houver)"
                        maxLength={10}
                      />
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Deixe em branco se a reunião não tiver senha.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cargos Permitidos */}
              <div>
                <label className="label">Cargos com Acesso *</label>
                <div className="flex flex-wrap gap-2">
                  {['Visitante', 'Aluno', 'Instrutor', 'Administrador'].map(cargo => (
                    <button
                      key={cargo}
                      type="button"
                      onClick={() => toggleCargo(cargo)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${formData.cargosPermitidos.includes(cargo)
                        ? 'glass-btn-primary'
                        : 'glass-btn'
                        }`}
                    >
                      {cargo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões Personalizados */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="label !mb-0">Botões Personalizados</label>
                  <GlassBadge variant="info" size="sm">
                    {formData.botoesPersonalizados.length} botão(ões)
                  </GlassBadge>
                </div>

                {/* Lista de botões existentes */}
                {formData.botoesPersonalizados.length > 0 && (
                  <div className="space-y-2">
                    {formData.botoesPersonalizados.map((btn, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                          <ExternalLink className="w-5 h-5 text-primary-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--color-text-primary)] truncate">{btn.nome}</p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">{btn.url}</p>
                        </div>
                        <GlassBadge variant="default" size="sm">{btn.icone}</GlassBadge>
                        <button
                          type="button"
                          onClick={() => removerBotao(index)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar novo botão */}
                <GlassCard hover={false} padding="md" className="!bg-[var(--glass-bg-hover)]">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Adicionar Novo Botão</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <GlassInput
                      placeholder="Nome do botão"
                      value={novoButton.nome}
                      onChange={(e) => setNovoButton({ ...novoButton, nome: e.target.value })}
                    />
                    <GlassSelect
                      value={novoButton.icone}
                      onChange={(e) => setNovoButton({ ...novoButton, icone: e.target.value })}
                      options={AVAILABLE_ICONS}
                    />
                    <GlassInput
                      placeholder="URL do link"
                      value={novoButton.url}
                      onChange={(e) => setNovoButton({ ...novoButton, url: e.target.value })}
                    />
                  </div>
                  <GlassButton
                    type="button"
                    onClick={adicionarBotao}
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Botão
                  </GlassButton>
                </GlassCard>
              </div>

              {/* Notas da Aula / Material */}
              <div>
                <label className="label">
                  {formData.tipo === 'material' ? 'Notas do Material (opcional)' : 'Notas da Aula (opcional)'}
                </label>
                <textarea
                  value={formData.notasAula}
                  onChange={(e) => setFormData({ ...formData, notasAula: e.target.value })}
                  className="glass-input min-h-[80px]"
                  placeholder={formData.tipo === 'material' ? 'Informações adicionais sobre o material, referências, etc.' : 'Material complementar, referências, etc.'}
                />
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t border-[var(--glass-border)]">
                <GlassButton type="submit" variant="primary" isLoading={isSaving} fullWidth>
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </GlassButton>
                <GlassButton type="button" onClick={() => setShowModal(false)} fullWidth>
                  Cancelar
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLessons;

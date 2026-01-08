import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Star,
  Users,
  Video,
  Save,
  Plus,
  Trash2,
  Upload,
  Quote,
  GraduationCap,
  Sparkles,
  Droplet
} from 'lucide-react';
import { siteConfigService, courseService } from '../../services/api';
import { Course } from '../../types';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

interface Testimonial {
  id: string;
  nome: string;
  citacao: string;
  imagem?: string;
  cargo?: string;
}

interface SiteConfig {
  featuredCourse: {
    enabled: boolean;
    courseId?: string;
    customDescription?: string;
  };
  testimonials: {
    enabled: boolean;
    items: Testimonial[];
  };
  demoVideo: {
    enabled: boolean;
    embedCode?: string;
    title?: string;
  };
  watermark: {
    enabled: boolean;
    opacity: number;
    showForAdmins: boolean;
  };
}

const AdminSiteConfig: React.FC = () => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'featured' | 'testimonials' | 'video' | 'watermark'>('featured');

  // Estado para novo depoimento
  const [newTestimonial, setNewTestimonial] = useState({
    nome: '',
    citacao: '',
    imagem: '',
    cargo: ''
  });
  const [showNewTestimonialForm, setShowNewTestimonialForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configRes, coursesRes] = await Promise.all([
        siteConfigService.get(),
        courseService.getAll({ ativo: 'true' })
      ]);
      // Garantir que todas as propriedades necessárias existam
      const configData = configRes.data || {};
      setConfig({
        ...configData,
        watermark: configData.watermark || {
          enabled: false,
          opacity: 20,
          showForAdmins: false
        }
      });
      setCourses(coursesRes.data.courses || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  // === CURSO EM DESTAQUE ===
  const handleFeaturedCourseChange = async (field: string, value: any) => {
    if (!config) return;

    const newConfig = {
      ...config,
      featuredCourse: {
        ...config.featuredCourse,
        [field]: value
      }
    };
    setConfig(newConfig);
  };

  const saveFeaturedCourse = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await siteConfigService.updateFeaturedCourse(config.featuredCourse);
      toast.success('Curso em destaque salvo!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  // === DEPOIMENTOS ===
  const handleTestimonialsEnabledChange = async (enabled: boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      testimonials: { ...config.testimonials, enabled }
    });
  };

  const saveTestimonialsEnabled = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await siteConfigService.updateTestimonials({ enabled: config.testimonials.enabled });
      toast.success('Configuração salva!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setNewTestimonial({ ...newTestimonial, imagem: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const addTestimonial = async () => {
    if (!newTestimonial.nome.trim() || !newTestimonial.citacao.trim()) {
      toast.error('Nome e citação são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      await siteConfigService.addTestimonial(newTestimonial);
      setNewTestimonial({ nome: '', citacao: '', imagem: '', cargo: '' });
      setShowNewTestimonialForm(false);
      loadData();
      toast.success('Depoimento adicionado!');
    } catch (error) {
      toast.error('Erro ao adicionar');
    } finally {
      setIsSaving(false);
    }
  };

  const removeTestimonial = async (id: string) => {
    if (!confirm('Remover este depoimento?')) return;

    try {
      await siteConfigService.removeTestimonial(id);
      loadData();
      toast.success('Depoimento removido');
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  // === VÍDEO DEMO ===
  const handleDemoVideoChange = (field: string, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      demoVideo: { ...config.demoVideo, [field]: value }
    });
  };

  const saveDemoVideo = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await siteConfigService.updateDemoVideo(config.demoVideo);
      toast.success('Vídeo de demonstração salvo!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  // === MARCA D'ÁGUA ===
  const handleWatermarkChange = (field: string, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      watermark: {
        ...config.watermark,
        [field]: value
      }
    });
  };

  const saveWatermark = async () => {
    if (!config || !config.watermark) {
      toast.error('Configuração não carregada');
      return;
    }
    setIsSaving(true);
    try {
      await siteConfigService.updateWatermark({
        enabled: config.watermark.enabled ?? false,
        opacity: config.watermark.opacity ?? 20,
        showForAdmins: config.watermark.showForAdmins ?? false
      });
      toast.success('Configurações de marca d\'água salvas!');
      // Recarregar dados para garantir sincronização
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar marca d\'água:', error);
      const message = error.response?.data?.message || error.message || 'Erro ao salvar configurações de marca d\'água';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loading size="lg" text="Carregando configurações..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            Configurações do Site
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            Personalize a landing page da plataforma
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--glass-border)] pb-2">
        <button
          onClick={() => setActiveTab('featured')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'featured'
              ? 'bg-primary-500 text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
            }`}
        >
          <Star className="w-4 h-4" />
          Curso em Destaque
        </button>
        <button
          onClick={() => setActiveTab('testimonials')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'testimonials'
              ? 'bg-primary-500 text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
            }`}
        >
          <Users className="w-4 h-4" />
          Depoimentos
        </button>
        <button
          onClick={() => setActiveTab('video')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'video'
              ? 'bg-primary-500 text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
            }`}
        >
          <Video className="w-4 h-4" />
          Vídeo Demo
        </button>
        <button
          onClick={() => setActiveTab('watermark')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'watermark'
              ? 'bg-primary-500 text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
            }`}
        >
          <Droplet className="w-4 h-4" />
          Marca D'água
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {config && (
        <>
          {/* Tab: Curso em Destaque */}
          {activeTab === 'featured' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
                      Curso em Destaque
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Destaque um curso na landing page com chamada especial
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.featuredCourse.enabled}
                    onChange={(e) => handleFeaturedCourseChange('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  <span className="ms-3 text-sm font-medium text-[var(--color-text-secondary)]">
                    {config.featuredCourse.enabled ? 'Ativado' : 'Desativado'}
                  </span>
                </label>
              </div>

              {config.featuredCourse.enabled && (
                <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                  <div>
                    <label className="label">Selecionar Curso</label>
                    <select
                      value={config.featuredCourse.courseId || ''}
                      onChange={(e) => handleFeaturedCourseChange('courseId', e.target.value)}
                      className="input"
                    >
                      <option value="">Selecione um curso...</option>
                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.titulo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Descrição Personalizada (opcional)
                      <span className="text-xs text-[var(--color-text-muted)] ml-2">
                        Deixe vazio para usar a descrição do curso
                      </span>
                    </label>
                    <textarea
                      value={config.featuredCourse.customDescription || ''}
                      onChange={(e) => handleFeaturedCourseChange('customDescription', e.target.value)}
                      className="input min-h-[100px]"
                      placeholder="Ex: Vagas limitadas! Inscreva-se agora e domine as técnicas avançadas de ecocardiografia..."
                    />
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      O curso aparecerá com destaque especial na landing page com chamada "Você não pode perder!"
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={saveFeaturedCourse}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Depoimentos */}
          {activeTab === 'testimonials' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
                      Depoimentos de Ex-Alunos
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Mostre histórias de sucesso de alunos que se destacaram
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.testimonials.enabled}
                    onChange={(e) => handleTestimonialsEnabledChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  <span className="ms-3 text-sm font-medium text-[var(--color-text-secondary)]">
                    {config.testimonials.enabled ? 'Ativado' : 'Desativado'}
                  </span>
                </label>
              </div>

              <button
                onClick={saveTestimonialsEnabled}
                className="btn btn-outline btn-sm"
              >
                <Save className="w-4 h-4" />
                Salvar Status
              </button>

              {/* Lista de Depoimentos */}
              <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-[var(--color-text-primary)]">
                    Depoimentos ({config.testimonials.items.length})
                  </h3>
                  <button
                    onClick={() => setShowNewTestimonialForm(true)}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                {/* Form novo depoimento */}
                {showNewTestimonialForm && (
                  <div
                    className={`bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-4 border-2 ${isDragging ? 'border-primary-500 border-dashed' : 'border-transparent'
                      }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Nome do Aluno *</label>
                        <input
                          type="text"
                          value={newTestimonial.nome}
                          onChange={(e) => setNewTestimonial({ ...newTestimonial, nome: e.target.value })}
                          className="input"
                          placeholder="Dr. João Silva"
                        />
                      </div>
                      <div>
                        <label className="label">Cargo/Especialidade</label>
                        <input
                          type="text"
                          value={newTestimonial.cargo}
                          onChange={(e) => setNewTestimonial({ ...newTestimonial, cargo: e.target.value })}
                          className="input"
                          placeholder="Cardiologista - Hospital X"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Citação/Depoimento *</label>
                      <textarea
                        value={newTestimonial.citacao}
                        onChange={(e) => setNewTestimonial({ ...newTestimonial, citacao: e.target.value })}
                        className="input min-h-[80px]"
                        placeholder="O curso mudou minha carreira..."
                      />
                    </div>

                    <div>
                      <label className="label">Foto (URL ou arraste uma imagem)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTestimonial.imagem}
                          onChange={(e) => setNewTestimonial({ ...newTestimonial, imagem: e.target.value })}
                          className="input flex-1"
                          placeholder="https://i.imgur.com/..."
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-outline"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        className="hidden"
                      />
                      {newTestimonial.imagem && (
                        <img src={newTestimonial.imagem} alt="Preview" className="w-16 h-16 rounded-full object-cover mt-2" loading="lazy" decoding="async" />
                      )}
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setShowNewTestimonialForm(false);
                          setNewTestimonial({ nome: '', citacao: '', imagem: '', cargo: '' });
                        }}
                        className="btn btn-outline"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={addTestimonial}
                        disabled={isSaving}
                        className="btn btn-primary"
                      >
                        <Plus className="w-4 h-4" />
                        {isSaving ? 'Adicionando...' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista */}
                {config.testimonials.items.length > 0 ? (
                  <div className="grid gap-4">
                    {config.testimonials.items.map((testimonial) => (
                      <div
                        key={testimonial.id}
                        className="bg-white dark:bg-white/5 rounded-xl p-4 border border-[var(--glass-border)] flex gap-4"
                      >
                        {testimonial.imagem ? (
                          <img
                            src={testimonial.imagem}
                            alt={testimonial.nome}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-primary-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-[var(--color-text-primary)]">{testimonial.nome}</h4>
                              {testimonial.cargo && (
                                <p className="text-sm text-[var(--color-text-muted)]">{testimonial.cargo}</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeTestimonial(testimonial.id)}
                              className="p-1 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-2 italic">
                            <Quote className="w-4 h-4 inline text-primary-500 mr-1" />
                            {testimonial.citacao}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--color-text-muted)]">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhum depoimento cadastrado</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Vídeo Demo */}
          {activeTab === 'video' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <Video className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
                      Vídeo de Demonstração
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Adicione um vídeo apresentando a plataforma na landing page
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.demoVideo.enabled}
                    onChange={(e) => handleDemoVideoChange('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  <span className="ms-3 text-sm font-medium text-[var(--color-text-secondary)]">
                    {config.demoVideo.enabled ? 'Ativado' : 'Desativado'}
                  </span>
                </label>
              </div>

              {config.demoVideo.enabled && (
                <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                  <div>
                    <label className="label">Título da Seção</label>
                    <input
                      type="text"
                      value={config.demoVideo.title || ''}
                      onChange={(e) => handleDemoVideoChange('title', e.target.value)}
                      className="input"
                      placeholder="Conheça nossa plataforma"
                    />
                  </div>

                  <div>
                    <label className="label">Código Embed do Vídeo (YouTube, Vimeo, etc)</label>
                    <textarea
                      value={config.demoVideo.embedCode || ''}
                      onChange={(e) => handleDemoVideoChange('embedCode', e.target.value)}
                      className="input min-h-[100px] font-mono text-sm"
                      placeholder='<iframe src="https://www.youtube.com/embed/..." ...></iframe>'
                    />
                  </div>

                  {config.demoVideo.embedCode && (
                    <div>
                      <label className="label">Preview</label>
                      <div
                        className="aspect-video max-w-2xl rounded-xl overflow-hidden bg-black border border-[var(--glass-border)]"
                        dangerouslySetInnerHTML={{ __html: config.demoVideo.embedCode }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={saveDemoVideo}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Marca D'água */}
          {activeTab === 'watermark' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Droplet className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
                      Marca D'água em Vídeos
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Configure marca d'água com nome e CPF do usuário sobre os vídeos
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.watermark?.enabled ?? false}
                    onChange={(e) => handleWatermarkChange('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  <span className="ms-3 text-sm font-medium text-[var(--color-text-secondary)]">
                    {config.watermark?.enabled ? 'Ativado' : 'Desativado'}
                  </span>
                </label>
              </div>

              {config.watermark?.enabled && (
                <div className="space-y-6 pt-4 border-t border-[var(--glass-border)]">
                  {/* Opacity Slider */}
                  <div>
                    <label className="label flex items-center justify-between">
                      <span>Transparência da Marca D'água</span>
                      <span className="text-sm font-mono text-primary-500">{config.watermark?.opacity ?? 20}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.watermark?.opacity ?? 20}
                      onChange={(e) => handleWatermarkChange('opacity', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      0% = Invisível • 100% = Totalmente visível (recomendado: 15-30%)
                    </p>
                  </div>

                  {/* Show for admins toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)]">
                        Exibir para Administradores
                      </h4>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        Se desativado, administradores não verão a marca d'água
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.watermark?.showForAdmins ?? false}
                        onChange={(e) => handleWatermarkChange('showForAdmins', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>

                  {/* Info box */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
                      <Droplet className="w-4 h-4" />
                      Como funciona
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                      <li>A marca d'água exibe o nome completo e CPF do usuário</li>
                      <li>Aparece sobre todos os vídeos embed (YouTube, Vimeo, etc)</li>
                      <li>Funciona em tela cheia</li>
                      <li>Não pode ser removida pelo usuário</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Botão salvar marca d\'água clicado', config?.watermark);
                    saveWatermark();
                  }}
                  disabled={isSaving}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminSiteConfig;

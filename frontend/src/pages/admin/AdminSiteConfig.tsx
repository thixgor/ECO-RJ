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
  Droplet,
  Smartphone,
  Monitor,
  Apple
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

interface AppDownloadPlatform {
  enabled: boolean;
  url?: string;
  comingSoon: boolean;
}

interface AppDownloadConfig {
  windows: AppDownloadPlatform;
  ios: AppDownloadPlatform;
  android: AppDownloadPlatform;
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
  zoomNative: {
    enabled: boolean;
  };
  appDownload: AppDownloadConfig;
}

const AdminSiteConfig: React.FC = () => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'featured' | 'testimonials' | 'video' | 'watermark' | 'zoom' | 'app'>('featured');

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
        },
        zoomNative: configData.zoomNative || {
          enabled: true
        },
        appDownload: configData.appDownload || {
          windows: { enabled: false, url: '', comingSoon: true },
          ios: { enabled: false, url: '', comingSoon: true },
          android: { enabled: false, url: '', comingSoon: true }
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

  // === ZOOM NATIVO ===
  const handleZoomNativeChange = (field: string, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      zoomNative: {
        ...config.zoomNative,
        [field]: value
      }
    });
  };

  const saveZoomNative = async () => {
    if (!config || !config.zoomNative) {
      toast.error('Configuração não carregada');
      return;
    }
    setIsSaving(true);
    try {
      await siteConfigService.updateZoomNative({
        enabled: config.zoomNative.enabled ?? true
      });
      toast.success('Configurações do Zoom Nativo salvas!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar Zoom Nativo:', error);
      const message = error.response?.data?.message || error.message || 'Erro ao salvar configurações do Zoom';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // === APP DOWNLOAD ===
  const handleAppDownloadChange = (platform: 'windows' | 'ios' | 'android', field: string, value: any) => {
    if (!config) return;

    const newPlatformConfig = {
      ...config.appDownload[platform],
      [field]: value
    };

    // Quando comingSoon mudar, ajustar enabled automaticamente
    if (field === 'comingSoon') {
      newPlatformConfig.enabled = !value; // enabled = true quando comingSoon = false
    }

    setConfig({
      ...config,
      appDownload: {
        ...config.appDownload,
        [platform]: newPlatformConfig
      }
    });
  };

  const saveAppDownload = async () => {
    if (!config || !config.appDownload) {
      toast.error('Configuração não carregada');
      return;
    }
    setIsSaving(true);
    try {
      await siteConfigService.updateAppDownload({
        windows: config.appDownload.windows,
        ios: config.appDownload.ios,
        android: config.appDownload.android
      });
      toast.success('Configurações do App salvas!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar App Download:', error);
      const message = error.response?.data?.message || error.message || 'Erro ao salvar configurações do App';
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
        <button
          onClick={() => setActiveTab('zoom')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'zoom'
              ? 'bg-primary-500 text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
            }`}
        >
          <Video className="w-4 h-4" />
          Zoom Nativo
        </button>
        <button
          onClick={() => setActiveTab('app')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'app'
              ? 'bg-primary-500 text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
            }`}
        >
          <Smartphone className="w-4 h-4" />
          Download App
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

          {/* Tab: Zoom Nativo */}
          {activeTab === 'zoom' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Video className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
                      Aulas ao Vivo - Zoom Nativo
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Habilite ou desabilite a opção de assistir aulas via Zoom integrado na plataforma
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.zoomNative?.enabled ?? true}
                    onChange={(e) => handleZoomNativeChange('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  <span className="ms-3 text-sm font-medium text-[var(--color-text-secondary)]">
                    {config.zoomNative?.enabled ? 'Habilitado' : 'Desabilitado'}
                  </span>
                </label>
              </div>

              <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                {/* Info box */}
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Como funciona
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li><strong>Habilitado:</strong> Exibe a opção "Assistir Aqui Nativamente" em destaque com badge "(em testes)"</li>
                    <li><strong>Desabilitado:</strong> Oculta a opção nativa, mostrando apenas "Abrir no App" e "Abrir no Navegador"</li>
                    <li>Alunos podem escolher entre assistir integrado na plataforma ou em app/navegador externo</li>
                    <li>O Zoom nativo permite melhor controle e experiência dentro da plataforma</li>
                  </ul>
                </div>

                {/* Status visual */}
                {config.zoomNative?.enabled ? (
                  <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-medium">Zoom Nativo Habilitado</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                      Os alunos verão a opção "Assistir Aqui Nativamente (em testes)" em destaque nas aulas ao vivo.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-400">
                      <Settings className="w-5 h-5" />
                      <span className="font-medium">Zoom Nativo Desabilitado</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Alunos só poderão abrir a aula no app Zoom ou navegador externo.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={saveZoomNative}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Download App */}
          {activeTab === 'app' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
                    Download do Aplicativo
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Configure os links de download para cada plataforma
                  </p>
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-[var(--glass-border)]">
                {/* Windows */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-[var(--glass-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--color-text-primary)]">Windows</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">Desktop para Windows</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.appDownload?.windows?.comingSoon ?? true}
                        onChange={(e) => handleAppDownloadChange('windows', 'comingSoon', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      <span className="ms-3 text-sm font-medium text-[var(--color-text-secondary)]">
                        {config.appDownload?.windows?.comingSoon ? 'Em breve' : 'Disponivel'}
                      </span>
                    </label>
                  </div>
                  {!config.appDownload?.windows?.comingSoon && (
                    <div>
                      <label className="label">URL de Download</label>
                      <input
                        type="url"
                        value={config.appDownload?.windows?.url || ''}
                        onChange={(e) => handleAppDownloadChange('windows', 'url', e.target.value)}
                        className="input"
                        placeholder="https://exemplo.com/app-windows.exe"
                      />
                    </div>
                  )}
                </div>

                {/* iOS / App Store */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-[var(--glass-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                        <Apple className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--color-text-primary)]">App Store (iOS)</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">iPhone e iPad</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.appDownload?.ios?.comingSoon ?? true}
                        onChange={(e) => handleAppDownloadChange('ios', 'comingSoon', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      <span className="ms-3 text-sm font-medium text-[var(--color-text-secondary)]">
                        {config.appDownload?.ios?.comingSoon ? 'Em breve' : 'Disponivel'}
                      </span>
                    </label>
                  </div>
                  {!config.appDownload?.ios?.comingSoon && (
                    <div>
                      <label className="label">URL da App Store</label>
                      <input
                        type="url"
                        value={config.appDownload?.ios?.url || ''}
                        onChange={(e) => handleAppDownloadChange('ios', 'url', e.target.value)}
                        className="input"
                        placeholder="https://apps.apple.com/app/..."
                      />
                    </div>
                  )}
                </div>

                {/* Android / Play Store */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-[var(--glass-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 via-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 9.99l-2.302 2.302-8.634-8.634z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--color-text-primary)]">Google Play (Android)</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">Dispositivos Android</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.appDownload?.android?.comingSoon ?? true}
                        onChange={(e) => handleAppDownloadChange('android', 'comingSoon', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      <span className="ms-3 text-sm font-medium text-[var(--color-text-secondary)]">
                        {config.appDownload?.android?.comingSoon ? 'Em breve' : 'Disponivel'}
                      </span>
                    </label>
                  </div>
                  {!config.appDownload?.android?.comingSoon && (
                    <div>
                      <label className="label">URL da Play Store</label>
                      <input
                        type="url"
                        value={config.appDownload?.android?.url || ''}
                        onChange={(e) => handleAppDownloadChange('android', 'url', e.target.value)}
                        className="input"
                        placeholder="https://play.google.com/store/apps/..."
                      />
                    </div>
                  )}
                </div>

                {/* Info box */}
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Informacoes
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li>A secao App aparece apenas para usuarios com cargo Aluno, Instrutor ou Administrador</li>
                    <li>Usuarios em modo paciente nao veem essa secao</li>
                    <li>A plataforma detecta automaticamente o dispositivo do usuario</li>
                    <li>Marque "Em breve" para plataformas que ainda nao estao disponiveis</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={saveAppDownload}
                  disabled={isSaving}
                  className="btn btn-primary"
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

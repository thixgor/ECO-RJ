import { Request, Response } from 'express';
import SystemSettings from '../models/SystemSettings';
import { AuthRequest } from '../middleware/auth';

// Interface para depoimentos
interface Testimonial {
  id: string;
  nome: string;
  citacao: string;
  imagem?: string;
  cargo?: string;
}

// Interface para configurações do site
interface SiteConfig {
  // Curso em destaque
  featuredCourse: {
    enabled: boolean;
    courseId?: string;
    customDescription?: string;
  };
  // Depoimentos de alunos
  testimonials: {
    enabled: boolean;
    items: Testimonial[];
  };
  // Vídeo de demonstração
  demoVideo: {
    enabled: boolean;
    embedCode?: string;
    title?: string;
  };
  // Marca d'água em vídeos
  watermark: {
    enabled: boolean;
    opacity: number; // 0-100
    showForAdmins: boolean;
  };
}

const DEFAULT_CONFIG: SiteConfig = {
  featuredCourse: {
    enabled: false,
    courseId: undefined,
    customDescription: undefined
  },
  testimonials: {
    enabled: false,
    items: []
  },
  demoVideo: {
    enabled: false,
    embedCode: undefined,
    title: 'Conheça nossa plataforma'
  },
  watermark: {
    enabled: true,
    opacity: 20,
    showForAdmins: false
  }
};

// @desc    Obter todas as configurações do site
// @route   GET /api/site-config
// @access  Public
export const getSiteConfig = async (req: Request, res: Response) => {
  try {
    const configSetting = await SystemSettings.findOne({ key: 'site_config' });
    const config: SiteConfig = configSetting?.value || DEFAULT_CONFIG;

    res.json(config);
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    res.status(500).json({ message: 'Erro ao obter configurações' });
  }
};

// @desc    Atualizar configurações do site
// @route   PUT /api/site-config
// @access  Private/Admin
export const updateSiteConfig = async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;

    // Buscar configuração atual
    const currentSetting = await SystemSettings.findOne({ key: 'site_config' });
    const currentConfig: SiteConfig = currentSetting?.value || DEFAULT_CONFIG;

    // Mesclar com atualizações
    const newConfig: SiteConfig = {
      featuredCourse: {
        ...currentConfig.featuredCourse,
        ...(updates.featuredCourse || {})
      },
      testimonials: {
        ...currentConfig.testimonials,
        ...(updates.testimonials || {})
      },
      demoVideo: {
        ...currentConfig.demoVideo,
        ...(updates.demoVideo || {})
      },
      watermark: {
        ...currentConfig.watermark,
        ...(updates.watermark || {})
      }
    };

    // Salvar
    await SystemSettings.findOneAndUpdate(
      { key: 'site_config' },
      { value: newConfig, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.json(newConfig);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ message: 'Erro ao atualizar configurações' });
  }
};

// @desc    Atualizar curso em destaque
// @route   PUT /api/site-config/featured-course
// @access  Private/Admin
export const updateFeaturedCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { enabled, courseId, customDescription } = req.body;

    const currentSetting = await SystemSettings.findOne({ key: 'site_config' });
    const currentConfig: SiteConfig = currentSetting?.value || DEFAULT_CONFIG;

    currentConfig.featuredCourse = {
      enabled: enabled !== undefined ? enabled : currentConfig.featuredCourse.enabled,
      courseId: courseId !== undefined ? courseId : currentConfig.featuredCourse.courseId,
      customDescription: customDescription !== undefined ? customDescription : currentConfig.featuredCourse.customDescription
    };

    await SystemSettings.findOneAndUpdate(
      { key: 'site_config' },
      { value: currentConfig, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.json({ message: 'Curso em destaque atualizado', featuredCourse: currentConfig.featuredCourse });
  } catch (error) {
    console.error('Erro ao atualizar curso em destaque:', error);
    res.status(500).json({ message: 'Erro ao atualizar curso em destaque' });
  }
};

// @desc    Atualizar depoimentos
// @route   PUT /api/site-config/testimonials
// @access  Private/Admin
export const updateTestimonials = async (req: AuthRequest, res: Response) => {
  try {
    const { enabled, items } = req.body;

    const currentSetting = await SystemSettings.findOne({ key: 'site_config' });
    const currentConfig: SiteConfig = currentSetting?.value || DEFAULT_CONFIG;

    currentConfig.testimonials = {
      enabled: enabled !== undefined ? enabled : currentConfig.testimonials.enabled,
      items: items !== undefined ? items : currentConfig.testimonials.items
    };

    await SystemSettings.findOneAndUpdate(
      { key: 'site_config' },
      { value: currentConfig, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.json({ message: 'Depoimentos atualizados', testimonials: currentConfig.testimonials });
  } catch (error) {
    console.error('Erro ao atualizar depoimentos:', error);
    res.status(500).json({ message: 'Erro ao atualizar depoimentos' });
  }
};

// @desc    Adicionar depoimento
// @route   POST /api/site-config/testimonials
// @access  Private/Admin
export const addTestimonial = async (req: AuthRequest, res: Response) => {
  try {
    const { nome, citacao, imagem, cargo } = req.body;

    if (!nome || !citacao) {
      return res.status(400).json({ message: 'Nome e citação são obrigatórios' });
    }

    const currentSetting = await SystemSettings.findOne({ key: 'site_config' });
    const currentConfig: SiteConfig = currentSetting?.value || DEFAULT_CONFIG;

    const newTestimonial: Testimonial = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      nome,
      citacao,
      imagem,
      cargo
    };

    currentConfig.testimonials.items.push(newTestimonial);

    await SystemSettings.findOneAndUpdate(
      { key: 'site_config' },
      { value: currentConfig, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Depoimento adicionado', testimonial: newTestimonial });
  } catch (error) {
    console.error('Erro ao adicionar depoimento:', error);
    res.status(500).json({ message: 'Erro ao adicionar depoimento' });
  }
};

// @desc    Remover depoimento
// @route   DELETE /api/site-config/testimonials/:id
// @access  Private/Admin
export const removeTestimonial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const currentSetting = await SystemSettings.findOne({ key: 'site_config' });
    const currentConfig: SiteConfig = currentSetting?.value || DEFAULT_CONFIG;

    const index = currentConfig.testimonials.items.findIndex(t => t.id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Depoimento não encontrado' });
    }

    currentConfig.testimonials.items.splice(index, 1);

    await SystemSettings.findOneAndUpdate(
      { key: 'site_config' },
      { value: currentConfig, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.json({ message: 'Depoimento removido' });
  } catch (error) {
    console.error('Erro ao remover depoimento:', error);
    res.status(500).json({ message: 'Erro ao remover depoimento' });
  }
};

// @desc    Atualizar vídeo de demonstração
// @route   PUT /api/site-config/demo-video
// @access  Private/Admin
export const updateDemoVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { enabled, embedCode, title } = req.body;

    const currentSetting = await SystemSettings.findOne({ key: 'site_config' });
    const currentConfig: SiteConfig = currentSetting?.value || DEFAULT_CONFIG;

    currentConfig.demoVideo = {
      enabled: enabled !== undefined ? enabled : currentConfig.demoVideo.enabled,
      embedCode: embedCode !== undefined ? embedCode : currentConfig.demoVideo.embedCode,
      title: title !== undefined ? title : currentConfig.demoVideo.title
    };

    await SystemSettings.findOneAndUpdate(
      { key: 'site_config' },
      { value: currentConfig, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.json({ message: 'Vídeo de demonstração atualizado', demoVideo: currentConfig.demoVideo });
  } catch (error) {
    console.error('Erro ao atualizar vídeo de demonstração:', error);
    res.status(500).json({ message: 'Erro ao atualizar vídeo de demonstração' });
  }
};

// @desc    Atualizar configurações de marca d'água
// @route   PUT /api/site-config/watermark
// @access  Private/Admin
export const updateWatermark = async (req: AuthRequest, res: Response) => {
  try {
    const { enabled, opacity, showForAdmins } = req.body;

    const currentSetting = await SystemSettings.findOne({ key: 'site_config' });
    const currentConfig: SiteConfig = currentSetting?.value || DEFAULT_CONFIG;

    currentConfig.watermark = {
      enabled: enabled !== undefined ? enabled : currentConfig.watermark.enabled,
      opacity: opacity !== undefined ? Math.max(0, Math.min(100, opacity)) : currentConfig.watermark.opacity,
      showForAdmins: showForAdmins !== undefined ? showForAdmins : currentConfig.watermark.showForAdmins
    };

    await SystemSettings.findOneAndUpdate(
      { key: 'site_config' },
      { value: currentConfig, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.json({ message: 'Configurações de marca d\'água atualizadas', watermark: currentConfig.watermark });
  } catch (error) {
    console.error('Erro ao atualizar marca d\'água:', error);
    res.status(500).json({ message: 'Erro ao atualizar marca d\'água' });
  }
};

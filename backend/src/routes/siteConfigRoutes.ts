import { Router } from 'express';
import {
  getSiteConfig,
  updateSiteConfig,
  updateFeaturedCourse,
  updateTestimonials,
  addTestimonial,
  removeTestimonial,
  updateDemoVideo,
  updateWatermark,
  updateZoomNative,
  updateAppDownload
} from '../controllers/siteConfigController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rota pública - obter configurações
router.get('/', getSiteConfig);

// Rotas administrativas
router.put('/', protect, adminOnly, updateSiteConfig);
router.put('/featured-course', protect, adminOnly, updateFeaturedCourse);
router.put('/testimonials', protect, adminOnly, updateTestimonials);
router.post('/testimonials', protect, adminOnly, addTestimonial);
router.delete('/testimonials/:id', protect, adminOnly, removeTestimonial);
router.put('/demo-video', protect, adminOnly, updateDemoVideo);
router.put('/watermark', protect, adminOnly, updateWatermark);
router.put('/zoom-native', protect, adminOnly, updateZoomNative);
router.put('/app-download', protect, adminOnly, updateAppDownload);

export default router;

import { Router } from 'express';
import {
  getGeneralStats,
  getTopLessons,
  getTopCourses,
  getRecentActivity
} from '../controllers/statsController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Todas as rotas são administrativas
router.use(protect, adminOnly);

router.get('/', getGeneralStats);
router.get('/top-lessons', getTopLessons);
router.get('/top-courses', getTopCourses);
router.get('/recent-activity', getRecentActivity);

export default router;

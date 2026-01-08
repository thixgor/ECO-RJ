import { Router } from 'express';
import {
  getLessonsByCourse,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  markAsWatched,
  getAllLessons,
  reorderLessons
} from '../controllers/lessonController';
import { protect, adminOnly, canViewLessons, optionalAuth } from '../middleware/auth';

const router = Router();

// Rotas públicas (permite não logados verem estrutura)
router.get('/course/:courseId', optionalAuth, getLessonsByCourse);
router.get('/:id', protect, canViewLessons, getLessonById);
router.post('/:id/watched', protect, markAsWatched);

// Rotas administrativas
router.get('/', protect, adminOnly, getAllLessons);
router.put('/reorder', protect, adminOnly, reorderLessons);
router.post('/', protect, adminOnly, createLesson);
router.put('/:id', protect, adminOnly, updateLesson);
router.delete('/:id', protect, adminOnly, deleteLesson);

export default router;

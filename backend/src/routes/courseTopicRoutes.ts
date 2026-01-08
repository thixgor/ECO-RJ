import { Router } from 'express';
import {
  getTopicsByCourse,
  getTopicsByCourseAdmin,
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic,
  reorderTopics
} from '../controllers/courseTopicController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.get('/course/:courseId', getTopicsByCourse);
router.get('/:id', getTopicById);

// Rotas administrativas
router.get('/course/:courseId/admin', protect, adminOnly, getTopicsByCourseAdmin);
router.post('/', protect, adminOnly, createTopic);
router.put('/reorder', protect, adminOnly, reorderTopics);
router.put('/:id', protect, adminOnly, updateTopic);
router.delete('/:id', protect, adminOnly, deleteTopic);

export default router;

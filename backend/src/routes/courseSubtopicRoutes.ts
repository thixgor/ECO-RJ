import { Router } from 'express';
import {
    getSubtopicsByTopic,
    getSubtopicsByCourse,
    getSubtopicsByTopicAdmin,
    getSubtopicsByCourseAdmin,
    getSubtopicById,
    createSubtopic,
    updateSubtopic,
    deleteSubtopic,
    reorderSubtopics
} from '../controllers/courseSubtopicController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.get('/topic/:topicId', getSubtopicsByTopic);
router.get('/course/:courseId', getSubtopicsByCourse);
router.get('/:id', getSubtopicById);

// Rotas administrativas
router.get('/topic/:topicId/admin', protect, adminOnly, getSubtopicsByTopicAdmin);
router.get('/course/:courseId/admin', protect, adminOnly, getSubtopicsByCourseAdmin);
router.post('/', protect, adminOnly, createSubtopic);
router.put('/reorder', protect, adminOnly, reorderSubtopics);
router.put('/:id', protect, adminOnly, updateSubtopic);
router.delete('/:id', protect, adminOnly, deleteSubtopic);

export default router;

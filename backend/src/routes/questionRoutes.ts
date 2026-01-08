import { Router } from 'express';
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  searchQuestions,
  getAllTags
} from '../controllers/questionController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Todas as rotas de questões são administrativas
router.get('/tags', protect, adminOnly, getAllTags);
router.get('/search', protect, adminOnly, searchQuestions);
router.get('/', protect, adminOnly, getQuestions);
router.get('/:id', protect, adminOnly, getQuestionById);
router.post('/', protect, adminOnly, createQuestion);
router.put('/:id', protect, adminOnly, updateQuestion);
router.delete('/:id', protect, adminOnly, deleteQuestion);

export default router;

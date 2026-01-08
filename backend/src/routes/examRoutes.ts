import { Router } from 'express';
import {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  startExam,
  submitExam,
  getMyAttempts,
  getExamAnswers
} from '../controllers/examController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rotas autenticadas (alunos e admins)
router.get('/', protect, getExams);
router.get('/:id', protect, getExamById);
router.post('/:id/start', protect, startExam);
router.post('/:id/submit', protect, submitExam);
router.get('/:id/my-attempts', protect, getMyAttempts);

// Rotas administrativas
router.post('/', protect, adminOnly, createExam);
router.put('/:id', protect, adminOnly, updateExam);
router.delete('/:id', protect, adminOnly, deleteExam);
router.get('/:id/answers', protect, adminOnly, getExamAnswers);

export default router;

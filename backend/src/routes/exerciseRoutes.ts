import { Router } from 'express';
import {
  getExercisesByLesson,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  answerExercise,
  checkQuestion,
  getMyProgress,
  getMyAnswers,
  getExerciseAnswers,
  getAllExercises,
  getAllExercisesAdmin
} from '../controllers/exerciseController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rotas autenticadas - rotas específicas devem vir ANTES de /:id
router.get('/lesson/:lessonId', protect, getExercisesByLesson);
router.get('/my-progress', protect, getMyProgress);
router.get('/', protect, getAllExercises);
router.post('/:id/answer', protect, answerExercise);
router.post('/:id/check', protect, checkQuestion);
router.get('/:id/my-answers', protect, getMyAnswers);
router.get('/:id', protect, getExerciseById);

// Rotas administrativas
router.get('/admin/all', protect, adminOnly, getAllExercisesAdmin);
router.get('/:id/answers', protect, adminOnly, getExerciseAnswers);
router.post('/', protect, adminOnly, createExercise);
router.put('/:id', protect, adminOnly, updateExercise);
router.delete('/:id', protect, adminOnly, deleteExercise);

export default router;

import { Router } from 'express';
import {
  createNote,
  getNotesByLesson,
  getNotesByUser,
  updateNote,
  deleteNote
} from '../controllers/notesController';
import { protect } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.post('/', protect, createNote);
router.get('/my', protect, getNotesByUser);
router.get('/lesson/:lessonId', protect, getNotesByLesson);
router.put('/:id', protect, updateNote);
router.delete('/:id', protect, deleteNote);

export default router;

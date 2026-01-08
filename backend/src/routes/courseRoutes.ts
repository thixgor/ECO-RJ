import { Router } from 'express';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  unenrollCourse,
  getCourseProgress,
  addAuthorizedStudent,
  removeAuthorizedStudent,
  getAuthorizedStudents,
  reorderCourses
} from '../controllers/courseController';
import { protect, adminOnly, optionalAuth } from '../middleware/auth';

const router = Router();

// Rotas públicas (mas com verificação opcional para cursos restritos)
router.get('/', optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourseById);

// Rotas autenticadas
router.post('/:id/enroll', protect, enrollCourse);
router.delete('/:id/enroll', protect, unenrollCourse);
router.get('/:id/progress', protect, getCourseProgress);

// Rotas administrativas
router.put('/reorder', protect, adminOnly, reorderCourses);
router.post('/', protect, adminOnly, createCourse);
router.put('/:id', protect, adminOnly, updateCourse);
router.delete('/:id', protect, adminOnly, deleteCourse);

// Rotas de autorização de alunos (Admin)
router.get('/:id/authorized', protect, adminOnly, getAuthorizedStudents);
router.post('/:id/authorize', protect, adminOnly, addAuthorizedStudent);
router.delete('/:id/authorize/:userId', protect, adminOnly, removeAuthorizedStudent);

export default router;

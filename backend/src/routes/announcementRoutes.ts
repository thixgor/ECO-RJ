import { Router } from 'express';
import {
  getAnnouncements,
  getUserAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  deleteAllAnnouncements,
  getAnnouncementById
} from '../controllers/announcementController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rota para usuários autenticados verem seus avisos
router.get('/user', protect, getUserAnnouncements);

// Rotas administrativas
router.get('/', protect, adminOnly, getAnnouncements);
router.post('/', protect, adminOnly, createAnnouncement);
router.delete('/all', protect, adminOnly, deleteAllAnnouncements);
router.get('/:id', protect, adminOnly, getAnnouncementById);
router.put('/:id', protect, adminOnly, updateAnnouncement);
router.put('/:id/toggle', protect, adminOnly, toggleAnnouncement);
router.delete('/:id', protect, adminOnly, deleteAnnouncement);

export default router;

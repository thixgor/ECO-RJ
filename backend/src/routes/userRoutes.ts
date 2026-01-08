import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUserCargo,
  toggleUserStatus,
  deleteUser,
  applySerialKey,
  getUserStats
} from '../controllers/userController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rotas de usuário comum
router.post('/apply-key', protect, applySerialKey);

// Rotas administrativas
router.get('/', protect, adminOnly, getUsers);
router.get('/stats', protect, adminOnly, getUserStats);
router.get('/:id', protect, adminOnly, getUserById);
router.put('/:id/cargo', protect, adminOnly, updateUserCargo);
router.put('/:id/status', protect, adminOnly, toggleUserStatus);
router.delete('/:id', protect, adminOnly, deleteUser);

export default router;

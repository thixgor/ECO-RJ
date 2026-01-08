import { Router } from 'express';
import {
  getAccessLogs,
  getUserAccessLogs,
  getAccessStats,
  getMyAccessLogs
} from '../controllers/accessLogController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rota para usuário ver seu próprio histórico
router.get('/me', protect, getMyAccessLogs);

// Rotas administrativas
router.get('/', protect, adminOnly, getAccessLogs);
router.get('/stats', protect, adminOnly, getAccessStats);
router.get('/user/:userId', protect, adminOnly, getUserAccessLogs);

export default router;

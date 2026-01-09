import { Router } from 'express';
import {
  getAccessLogs,
  getUserAccessLogs,
  getAccessStats,
  getMyAccessLogs,
  getLogsStatus,
  toggleLogs,
  clearLogs,
  clearOldLogs
} from '../controllers/accessLogController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rota para usuário ver seu próprio histórico
router.get('/me', protect, getMyAccessLogs);

// Rotas administrativas
router.get('/', protect, adminOnly, getAccessLogs);
router.get('/stats', protect, adminOnly, getAccessStats);
router.get('/status', protect, adminOnly, getLogsStatus);
router.get('/user/:userId', protect, adminOnly, getUserAccessLogs);

// Rotas de controle de logs (Admin)
router.post('/toggle', protect, adminOnly, toggleLogs);
router.delete('/clear', protect, adminOnly, clearLogs);
router.delete('/clear-old', protect, adminOnly, clearOldLogs);

export default router;

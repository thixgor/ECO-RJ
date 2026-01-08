import { Router } from 'express';
import {
  getTopics,
  getTopicById,
  createTopic,
  replyTopic,
  updateTopic,
  deleteTopic,
  deleteReply,
  togglePinTopic,
  toggleCloseTopic,
  toggleForumLock,
  getForumStatus,
  getMyTopics
} from '../controllers/forumController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Rotas de configuração (devem vir antes das rotas com :id)
router.get('/settings/status', protect, getForumStatus);
router.put('/settings/lock', protect, adminOnly, toggleForumLock);

// Rotas autenticadas
router.get('/', protect, getTopics);
router.get('/my-topics', protect, getMyTopics);
router.get('/:id', protect, getTopicById);
router.post('/', protect, createTopic);
router.post('/:id/reply', protect, replyTopic);
router.put('/:id', protect, updateTopic);

// Rotas de deleção (autor ou admin)
router.delete('/:id', protect, deleteTopic);
router.delete('/:id/reply/:replyId', protect, deleteReply);

// Rotas administrativas
router.put('/:id/pin', protect, adminOnly, togglePinTopic);
router.put('/:id/close', protect, adminOnly, toggleCloseTopic);

export default router;

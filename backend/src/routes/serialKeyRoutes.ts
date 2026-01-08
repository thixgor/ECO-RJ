import { Router } from 'express';
import {
  getSerialKeys,
  generateSerialKeys,
  getSerialKeyById,
  deleteSerialKey,
  deleteAllSerialKeys,
  renewSerialKey,
  exportSerialKeys,
  getSerialKeyStats
} from '../controllers/serialKeyController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Todas as rotas são administrativas
router.use(protect, adminOnly);

router.get('/', getSerialKeys);
router.get('/stats', getSerialKeyStats);
router.get('/export', exportSerialKeys);
router.post('/generate', generateSerialKeys);
router.delete('/all', deleteAllSerialKeys);
router.get('/:id', getSerialKeyById);
router.delete('/:id', deleteSerialKey);
router.put('/:id/renew', renewSerialKey);

export default router;

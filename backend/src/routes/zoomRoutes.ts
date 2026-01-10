import express from 'express';
import { generateZoomSignature } from '../controllers/zoomController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Rota protegida - apenas usuários autenticados podem gerar signature
router.post('/signature', protect, generateZoomSignature);

export default router;

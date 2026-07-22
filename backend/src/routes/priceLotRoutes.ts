import { Router } from 'express';
import {
  getLotsByCourse,
  createLot,
  updateLot,
  deleteLot
} from '../controllers/priceLotController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

router.use(protect, adminOnly);

router.get('/course/:courseId', getLotsByCourse);
router.post('/', createLot);
router.put('/:id', updateLot);
router.delete('/:id', deleteLot);

export default router;

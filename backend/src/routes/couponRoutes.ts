import { Router } from 'express';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
} from '../controllers/couponController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

router.use(protect, adminOnly);

router.get('/', getCoupons);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

export default router;

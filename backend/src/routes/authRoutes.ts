import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  resetPasswordWithToken,
  forgotPassword,
  validateResetToken,
  confirmPasswordReset,
  getRecoveryOptions
} from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
// Recuperação pelo token permanente gerado no cadastro (arquivo .txt)
router.post('/reset-password', resetPasswordWithToken);

// Recuperação por e-mail (link de uso único, validade curta)
router.get('/recovery-options', getRecoveryOptions);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/validate', validateResetToken);
router.post('/reset-password/confirm', confirmPasswordReset);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

export default router;

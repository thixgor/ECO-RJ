import express from 'express';
import {
  getCertificates,
  getCertificateStats,
  getMyCertificates,
  getCertificateById,
  generateCertificate,
  deleteCertificate,
  deleteUserCertificates,
  validateCertificate,
  getCourseHours
} from '../controllers/certificateController';
import { protect, adminOnly } from '../middleware/auth';

const router = express.Router();

// Public route - certificate validation (must be before protected routes)
router.get('/validate/:code', validateCertificate);

// Protected route - get current user's certificates
router.get('/my', protect, getMyCertificates);

// Admin routes
router.get('/stats', protect, adminOnly, getCertificateStats);
router.get('/course-hours/:courseId', protect, adminOnly, getCourseHours);
router.get('/', protect, adminOnly, getCertificates);
router.get('/:id', protect, adminOnly, getCertificateById);
router.post('/generate', protect, adminOnly, generateCertificate);
router.delete('/user/:userId', protect, adminOnly, deleteUserCertificates);
router.delete('/:id', protect, adminOnly, deleteCertificate);

export default router;

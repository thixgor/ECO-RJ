import express from 'express';
import {
  getCertificateRequests,
  getCertificateRequestStats,
  getMyCertificateRequests,
  createCertificateRequest,
  approveCertificateRequest,
  rejectCertificateRequest,
  deleteCertificateRequest,
  canRequestCertificate,
  issueCertificateImmediate
} from '../controllers/certificateRequestController';
import { protect, adminOnly } from '../middleware/auth';

const router = express.Router();

// Protected routes - user's own requests
router.get('/my', protect, getMyCertificateRequests);
router.post('/', protect, createCertificateRequest);
router.get('/can-request/:courseId', protect, canRequestCertificate);
router.post('/immediate/:courseId', protect, issueCertificateImmediate);

// Admin routes
router.get('/stats', protect, adminOnly, getCertificateRequestStats);
router.get('/', protect, adminOnly, getCertificateRequests);
router.put('/:id/approve', protect, adminOnly, approveCertificateRequest);
router.put('/:id/reject', protect, adminOnly, rejectCertificateRequest);
router.delete('/:id', protect, adminOnly, deleteCertificateRequest);

export default router;

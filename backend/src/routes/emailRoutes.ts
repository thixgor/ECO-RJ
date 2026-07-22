import { Router } from 'express';
import {
  getEmailConfig,
  getTemplates,
  getTemplateById,
  updateTemplate,
  resetTemplate,
  previewEmail,
  getRecipients,
  sendBulkEmail,
  sendPurchaseReceipt,
  processCourseCompletions,
  getEmailLogs,
  getEmailStats,
  clearEmailLogs
} from '../controllers/emailController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Todas as rotas de e-mail são restritas a administradores
router.use(protect, adminOnly);

// Configuração / status
router.get('/config', getEmailConfig);
router.get('/stats', getEmailStats);

// Templates
router.get('/templates', getTemplates);
router.get('/templates/:id', getTemplateById);
router.put('/templates/:id', updateTemplate);
router.post('/templates/:id/reset', resetTemplate);

// Pré-visualização
router.post('/preview', previewEmail);

// Destinatários e envio
router.get('/recipients', getRecipients);
router.post('/send', sendBulkEmail);

// E-mails automáticos disparados manualmente / por job
router.post('/purchase-receipt', sendPurchaseReceipt);
router.post('/process-course-completions', processCourseCompletions);

// Histórico
router.get('/logs', getEmailLogs);
router.delete('/logs', clearEmailLogs);

export default router;

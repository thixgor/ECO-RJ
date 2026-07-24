import { Router } from 'express';
import {
  getPublicConfig,
  getQuote,
  createCheckout,
  processPayment,
  mercadoPagoWebhook,
  getOrderStatus,
  syncOrderStatus,
  getMyOrders
} from '../controllers/paymentController';
import {
  getAllOrders,
  getOrderById,
  getPaymentStats,
  getUnifiedStats,
  getUnifiedOrders,
  refulfillOrder,
  getAdminPaymentConfig,
  updateAdminPaymentConfig,
  resetTerms,
  updateCoursePricing,
  getCoursesPricing
} from '../controllers/adminPaymentController';
import { protect, adminOnly, optionalAuth } from '../middleware/auth';

const router = Router();

// ---- Público ----
router.get('/config', getPublicConfig);
router.post('/quote', getQuote);
router.post('/checkout', optionalAuth, createCheckout);
router.post('/order/:numeroPedido/process', optionalAuth, processPayment);
router.all('/webhook', mercadoPagoWebhook); // MP pode usar GET ou POST
router.get('/order/:numeroPedido', getOrderStatus);
router.post('/order/:numeroPedido/sync', syncOrderStatus);

// ---- Usuário logado ----
router.get('/my-orders', protect, getMyOrders);

// ---- Admin ----
router.get('/admin/orders', protect, adminOnly, getAllOrders);
router.get('/admin/orders-unified', protect, adminOnly, getUnifiedOrders);
router.get('/admin/stats', protect, adminOnly, getPaymentStats);
router.get('/admin/stats-unified', protect, adminOnly, getUnifiedStats);
router.get('/admin/config', protect, adminOnly, getAdminPaymentConfig);
router.put('/admin/config', protect, adminOnly, updateAdminPaymentConfig);
router.post('/admin/config/reset-terms', protect, adminOnly, resetTerms);
router.get('/admin/courses-pricing', protect, adminOnly, getCoursesPricing);
router.put('/admin/course/:id/pricing', protect, adminOnly, updateCoursePricing);
router.get('/admin/orders/:id', protect, adminOnly, getOrderById);
router.post('/admin/orders/:id/refulfill', protect, adminOnly, refulfillOrder);

export default router;

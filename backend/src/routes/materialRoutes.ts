import { Router } from 'express';
import {
  listMaterials,
  getMaterialById,
  quoteMaterial,
  createMaterialCheckout,
  processMaterialPayment,
  materialWebhook,
  getMaterialOrderStatus,
  syncMaterialOrder,
  recoverMaterialAccess,
  getAccessByToken,
  downloadByToken,
  getMyMaterials,
  getMaterialContent,
  claimMaterialAccess
} from '../controllers/materialController';
import {
  getReviews,
  upsertReview,
  deleteMyReview,
  adminDeleteReview
} from '../controllers/materialReviewController';
import {
  listMaterialsAdmin,
  getMaterialAdmin,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  listMaterialOrders,
  getMaterialOrderAdmin,
  getMaterialStats,
  refulfillMaterialOrder,
  grantMaterialAccess,
  updateEntitlement
} from '../controllers/adminMaterialController';
import { handleBlobUpload } from '../controllers/blobUploadController';
import { protect, adminOnly, optionalAuth } from '../middleware/auth';

const router = Router();

// ---- Webhook (deve vir antes de qualquer rota com parâmetro) ----
router.all('/webhook', materialWebhook);

// ---- Público / Checkout ----
router.post('/quote', quoteMaterial);
router.post('/checkout', optionalAuth, createMaterialCheckout);
router.post('/order/:numeroPedido/process', optionalAuth, processMaterialPayment);
router.post('/recover', recoverMaterialAccess);
router.get('/order/:numeroPedido', getMaterialOrderStatus);
router.post('/order/:numeroPedido/sync', syncMaterialOrder);

// ---- Acesso por token (convidado) ----
router.get('/access/:token/download/:index', downloadByToken);
router.get('/access/:token', getAccessByToken);

// ---- Usuário logado ----
router.get('/my', protect, getMyMaterials);
router.post('/claim', protect, claimMaterialAccess);

// ---- Admin ----
// Client Upload do Vercel Blob (arquivos grandes). SEM protect/adminOnly: a rota
// também recebe o callback dos servidores da Vercel (sem nosso JWT). A autenticação
// do admin ocorre dentro de handleBlobUpload (JWT via clientPayload).
router.post('/admin/blob-upload', handleBlobUpload);

router.get('/admin/all', protect, adminOnly, listMaterialsAdmin);
router.get('/admin/stats', protect, adminOnly, getMaterialStats);
router.get('/admin/orders', protect, adminOnly, listMaterialOrders);
router.get('/admin/orders/:id', protect, adminOnly, getMaterialOrderAdmin);
router.post('/admin/orders/:id/refulfill', protect, adminOnly, refulfillMaterialOrder);
router.delete('/admin/reviews/:reviewId', protect, adminOnly, adminDeleteReview);
router.put('/admin/entitlements/:id', protect, adminOnly, updateEntitlement);
router.post('/admin', protect, adminOnly, createMaterial);
router.get('/admin/:id', protect, adminOnly, getMaterialAdmin);
router.put('/admin/:id', protect, adminOnly, updateMaterial);
router.delete('/admin/:id', protect, adminOnly, deleteMaterial);
router.post('/admin/:id/grant', protect, adminOnly, grantMaterialAccess);

// ---- Avaliações ----
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', protect, upsertReview);
router.delete('/:id/reviews', protect, deleteMyReview);

// ---- Conteúdo (logado, com acesso) ----
router.get('/:id/content', protect, getMaterialContent);

// ---- Listagem e detalhe público (por último, pois usam :id) ----
router.get('/', optionalAuth, listMaterials);
router.get('/:id', optionalAuth, getMaterialById);

export default router;

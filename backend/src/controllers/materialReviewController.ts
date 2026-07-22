import { Response, Request } from 'express';
import mongoose from 'mongoose';
import Material from '../models/Material';
import MaterialReview from '../models/MaterialReview';
import MaterialEntitlement, { isEntitlementValid } from '../models/MaterialEntitlement';
import { AuthRequest } from '../middleware/auth';

/** Recalcula e persiste a média e o total de avaliações de um material. */
async function recomputeAggregate(materialId: string): Promise<{ media: number; total: number }> {
  const agg = await MaterialReview.aggregate([
    { $match: { material: new mongoose.Types.ObjectId(materialId) } },
    { $group: { _id: null, media: { $avg: '$nota' }, total: { $sum: 1 } } }
  ]);
  const media = agg[0] ? Math.round(agg[0].media * 10) / 10 : 0;
  const total = agg[0] ? agg[0].total : 0;
  await Material.updateOne({ _id: materialId }, { $set: { avaliacaoMedia: media, avaliacaoTotal: total } });
  return { media, total };
}

// @desc    Listar avaliações de um material
// @route   GET /api/materials/:id/reviews
// @access  Public
export const getReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await MaterialReview.find({ material: req.params.id })
      .sort({ createdAt: -1 })
      .limit(200);

    const material = await Material.findById(req.params.id).select('avaliacaoMedia avaliacaoTotal');
    res.json({
      reviews: reviews.map((r) => ({
        _id: r._id,
        nota: r.nota,
        comentario: r.comentario,
        autorNome: r.autorNome,
        createdAt: r.createdAt
      })),
      resumo: {
        media: material?.avaliacaoMedia || 0,
        total: material?.avaliacaoTotal || 0
      }
    });
  } catch (error) {
    console.error('Erro ao listar avaliações:', error);
    res.status(500).json({ message: 'Erro ao listar avaliações' });
  }
};

// @desc    Criar/atualizar minha avaliação (somente quem comprou)
// @route   POST /api/materials/:id/reviews
// @access  Private
export const upsertReview = async (req: AuthRequest, res: Response) => {
  try {
    const materialId = req.params.id;
    const nota = Number(req.body?.nota);
    const comentario = String(req.body?.comentario || '').trim().substring(0, 1000);

    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      return res.status(400).json({ message: 'A nota deve ser um número inteiro de 1 a 5' });
    }

    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });

    // Só avalia quem tem acesso (comprou) — por conta OU e-mail
    const or: any[] = [{ user: req.user?._id }];
    if (req.user?.email) or.push({ email: req.user.email.toLowerCase() });
    const ents = await MaterialEntitlement.find({ material: materialId, $or: or });
    const temAcesso = ents.some((e) => isEntitlementValid(e) && e.podeAvaliar !== false);
    if (!temAcesso) {
      return res.status(403).json({ message: 'Apenas quem comprou este material pode avaliá-lo.' });
    }

    const review = await MaterialReview.findOneAndUpdate(
      { material: materialId, user: req.user?._id },
      {
        $set: {
          nota,
          comentario,
          autorNome: req.user?.nomeCompleto || 'Aluno',
          order: ents[0]?.order
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const resumo = await recomputeAggregate(materialId);
    res.status(201).json({
      message: 'Avaliação registrada com sucesso!',
      review: {
        _id: review._id,
        nota: review.nota,
        comentario: review.comentario,
        autorNome: review.autorNome,
        createdAt: review.createdAt
      },
      resumo
    });
  } catch (error: any) {
    console.error('Erro ao registrar avaliação:', error);
    res.status(500).json({ message: 'Erro ao registrar avaliação' });
  }
};

// @desc    Remover minha avaliação
// @route   DELETE /api/materials/:id/reviews
// @access  Private
export const deleteMyReview = async (req: AuthRequest, res: Response) => {
  try {
    const materialId = req.params.id;
    const deleted = await MaterialReview.findOneAndDelete({ material: materialId, user: req.user?._id });
    if (!deleted) return res.status(404).json({ message: 'Avaliação não encontrada' });
    const resumo = await recomputeAggregate(materialId);
    res.json({ message: 'Avaliação removida', resumo });
  } catch (error) {
    console.error('Erro ao remover avaliação:', error);
    res.status(500).json({ message: 'Erro ao remover avaliação' });
  }
};

// @desc    Remover avaliação (Admin)
// @route   DELETE /api/materials/admin/reviews/:reviewId
// @access  Private/Admin
export const adminDeleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const review = await MaterialReview.findByIdAndDelete(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Avaliação não encontrada' });
    const resumo = await recomputeAggregate(review.material.toString());
    res.json({ message: 'Avaliação removida', resumo });
  } catch (error) {
    console.error('Erro ao remover avaliação (admin):', error);
    res.status(500).json({ message: 'Erro ao remover avaliação' });
  }
};

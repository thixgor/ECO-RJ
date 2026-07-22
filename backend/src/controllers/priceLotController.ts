import { Response } from 'express';
import PriceLot from '../models/PriceLot';
import Course from '../models/Course';
import { AuthRequest } from '../middleware/auth';

// @desc    Listar lotes de um curso (Admin)
// @route   GET /api/price-lots/course/:courseId
// @access  Private/Admin
export const getLotsByCourse = async (req: AuthRequest, res: Response) => {
  try {
    const lots = await PriceLot.find({ curso: req.params.courseId }).sort({ ordem: 1, createdAt: 1 });
    res.json({ lots });
  } catch (error) {
    console.error('Erro ao listar lotes:', error);
    res.status(500).json({ message: 'Erro ao listar lotes' });
  }
};

// @desc    Criar lote (Admin)
// @route   POST /api/price-lots
// @access  Private/Admin
export const createLot = async (req: AuthRequest, res: Response) => {
  try {
    const { curso, nome, preco, quantidadeTotal, ordem, ativo } = req.body;
    if (!curso || !nome || preco === undefined) {
      return res.status(400).json({ message: 'Curso, nome e preço são obrigatórios' });
    }
    if (Number(preco) < 0) return res.status(400).json({ message: 'Preço inválido' });

    const courseExists = await Course.findById(curso);
    if (!courseExists) return res.status(404).json({ message: 'Curso não encontrado' });

    const lot = await PriceLot.create({
      curso,
      nome,
      preco: Number(preco),
      quantidadeTotal: quantidadeTotal !== undefined ? Number(quantidadeTotal) : 0,
      ordem: ordem !== undefined ? Number(ordem) : 0,
      ativo: ativo !== undefined ? ativo : true,
      createdBy: req.user?._id
    });
    res.status(201).json(lot);
  } catch (error) {
    console.error('Erro ao criar lote:', error);
    res.status(500).json({ message: 'Erro ao criar lote' });
  }
};

// @desc    Atualizar lote (Admin)
// @route   PUT /api/price-lots/:id
// @access  Private/Admin
export const updateLot = async (req: AuthRequest, res: Response) => {
  try {
    const lot = await PriceLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ message: 'Lote não encontrado' });

    const { nome, preco, quantidadeTotal, quantidadeVendida, ordem, ativo } = req.body;
    if (nome !== undefined) lot.nome = nome;
    if (preco !== undefined) {
      if (Number(preco) < 0) return res.status(400).json({ message: 'Preço inválido' });
      lot.preco = Number(preco);
    }
    if (quantidadeTotal !== undefined) lot.quantidadeTotal = Number(quantidadeTotal);
    if (quantidadeVendida !== undefined) lot.quantidadeVendida = Math.max(0, Number(quantidadeVendida));
    if (ordem !== undefined) lot.ordem = Number(ordem);
    if (ativo !== undefined) lot.ativo = ativo;

    await lot.save();
    res.json(lot);
  } catch (error) {
    console.error('Erro ao atualizar lote:', error);
    res.status(500).json({ message: 'Erro ao atualizar lote' });
  }
};

// @desc    Deletar lote (Admin)
// @route   DELETE /api/price-lots/:id
// @access  Private/Admin
export const deleteLot = async (req: AuthRequest, res: Response) => {
  try {
    const lot = await PriceLot.findByIdAndDelete(req.params.id);
    if (!lot) return res.status(404).json({ message: 'Lote não encontrado' });
    res.json({ message: 'Lote deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar lote:', error);
    res.status(500).json({ message: 'Erro ao deletar lote' });
  }
};

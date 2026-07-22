import { Response } from 'express';
import Coupon from '../models/Coupon';
import { AuthRequest } from '../middleware/auth';

// @desc    Listar cupons (Admin)
// @route   GET /api/coupons
// @access  Private/Admin
export const getCoupons = async (_req: AuthRequest, res: Response) => {
  try {
    const coupons = await Coupon.find()
      .populate('cursosAplicaveis', 'titulo')
      .sort({ createdAt: -1 });
    res.json({ coupons });
  } catch (error) {
    console.error('Erro ao listar cupons:', error);
    res.status(500).json({ message: 'Erro ao listar cupons' });
  }
};

// @desc    Criar cupom (Admin)
// @route   POST /api/coupons
// @access  Private/Admin
export const createCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const {
      codigo, descricao, tipo, valor, ativo,
      dataInicio, dataValidade, usosMaximos, usosPorEmail,
      valorMinimoCompra, cursosAplicaveis
    } = req.body;

    if (!codigo || !tipo || valor === undefined) {
      return res.status(400).json({ message: 'Código, tipo e valor são obrigatórios' });
    }
    if (!['percentual', 'fixo'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo inválido' });
    }
    if (Number(valor) < 0 || (tipo === 'percentual' && Number(valor) > 100)) {
      return res.status(400).json({ message: 'Valor do cupom inválido' });
    }

    const codigoUpper = String(codigo).toUpperCase().trim();
    const existe = await Coupon.findOne({ codigo: codigoUpper });
    if (existe) return res.status(400).json({ message: 'Já existe um cupom com esse código' });

    const coupon = await Coupon.create({
      codigo: codigoUpper,
      descricao: descricao || '',
      tipo,
      valor: Number(valor),
      ativo: ativo !== undefined ? ativo : true,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataValidade: dataValidade ? new Date(dataValidade) : undefined,
      usosMaximos: usosMaximos !== undefined ? Number(usosMaximos) : 0,
      usosPorEmail: usosPorEmail !== undefined ? Number(usosPorEmail) : 1,
      valorMinimoCompra: valorMinimoCompra !== undefined ? Number(valorMinimoCompra) : 0,
      cursosAplicaveis: Array.isArray(cursosAplicaveis) ? cursosAplicaveis : [],
      createdBy: req.user?._id
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    res.status(500).json({ message: 'Erro ao criar cupom' });
  }
};

// @desc    Atualizar cupom (Admin)
// @route   PUT /api/coupons/:id
// @access  Private/Admin
export const updateCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Cupom não encontrado' });

    const {
      codigo, descricao, tipo, valor, ativo,
      dataInicio, dataValidade, usosMaximos, usosPorEmail,
      valorMinimoCompra, cursosAplicaveis
    } = req.body;

    if (codigo !== undefined) {
      const codigoUpper = String(codigo).toUpperCase().trim();
      if (codigoUpper !== coupon.codigo) {
        const existe = await Coupon.findOne({ codigo: codigoUpper });
        if (existe) return res.status(400).json({ message: 'Já existe um cupom com esse código' });
        coupon.codigo = codigoUpper;
      }
    }
    if (tipo !== undefined) {
      if (!['percentual', 'fixo'].includes(tipo)) return res.status(400).json({ message: 'Tipo inválido' });
      coupon.tipo = tipo;
    }
    if (valor !== undefined) {
      if (Number(valor) < 0 || (coupon.tipo === 'percentual' && Number(valor) > 100)) {
        return res.status(400).json({ message: 'Valor do cupom inválido' });
      }
      coupon.valor = Number(valor);
    }
    if (descricao !== undefined) coupon.descricao = descricao;
    if (ativo !== undefined) coupon.ativo = ativo;
    if (dataInicio !== undefined) coupon.dataInicio = dataInicio ? new Date(dataInicio) : undefined;
    if (dataValidade !== undefined) coupon.dataValidade = dataValidade ? new Date(dataValidade) : undefined;
    if (usosMaximos !== undefined) coupon.usosMaximos = Number(usosMaximos);
    if (usosPorEmail !== undefined) coupon.usosPorEmail = Number(usosPorEmail);
    if (valorMinimoCompra !== undefined) coupon.valorMinimoCompra = Number(valorMinimoCompra);
    if (cursosAplicaveis !== undefined) coupon.cursosAplicaveis = Array.isArray(cursosAplicaveis) ? cursosAplicaveis : [];

    await coupon.save();
    res.json(coupon);
  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    res.status(500).json({ message: 'Erro ao atualizar cupom' });
  }
};

// @desc    Deletar cupom (Admin)
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
export const deleteCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Cupom não encontrado' });
    res.json({ message: 'Cupom deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cupom:', error);
    res.status(500).json({ message: 'Erro ao deletar cupom' });
  }
};

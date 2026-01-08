import { Request, Response } from 'express';
import SerialKey from '../models/SerialKey';
import User from '../models/User';

// Função para gerar chave única no formato ECO-YYYYMM-XXXXXXXX
const generateUniqueKey = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
  const yearMonth = `${year}${month}`; // Ex: 202601

  let key = '';
  let isUnique = false;

  while (!isUnique) {
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    key = `ECO-${yearMonth}-${randomPart}`; // Ex: ECO-202601-A7K9B2X5

    const existing = await SerialKey.findOne({ chave: key });
    if (!existing) {
      isUnique = true;
    }
  }

  return key;
};

// @desc    Listar todas as serial keys (Admin)
// @route   GET /api/serial-keys
// @access  Private/Admin
export const getSerialKeys = async (req: Request, res: Response) => {
  try {
    const { status, cargoAtribuido, page = 1, limit = 50 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (cargoAtribuido) query.cargoAtribuido = cargoAtribuido;

    const skip = (Number(page) - 1) * Number(limit);

    const [keys, total] = await Promise.all([
      SerialKey.find(query)
        .populate('usadaPor', 'nomeCompleto email')
        .populate('cursoRestrito', 'titulo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SerialKey.countDocuments(query)
    ]);

    res.json({
      keys,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar serial keys:', error);
    res.status(500).json({ message: 'Erro ao listar serial keys' });
  }
};

// @desc    Gerar novas serial keys (Admin)
// @route   POST /api/serial-keys/generate
// @access  Private/Admin
export const generateSerialKeys = async (req: Request, res: Response) => {
  try {
    const { quantidade, cargoAtribuido, validadeDias, descricao, cursoRestrito } = req.body;

    if (!quantidade || !cargoAtribuido || !validadeDias) {
      return res.status(400).json({
        message: 'Quantidade, cargo e validade são obrigatórios'
      });
    }

    const validCargos = ['Visitante', 'Aluno', 'Instrutor', 'Administrador'];
    if (!validCargos.includes(cargoAtribuido)) {
      return res.status(400).json({ message: 'Cargo inválido' });
    }

    if (quantidade < 1 || quantidade > 100) {
      return res.status(400).json({ message: 'Quantidade deve estar entre 1 e 100' });
    }

    const validade = new Date();
    validade.setDate(validade.getDate() + Number(validadeDias));

    const generatedKeys: string[] = [];

    for (let i = 0; i < Number(quantidade); i++) {
      const chave = await generateUniqueKey();
      await SerialKey.create({
        chave,
        cargoAtribuido,
        validade,
        descricao: descricao || `Chaves geradas em ${new Date().toLocaleDateString('pt-BR')}`,
        cursoRestrito: cursoRestrito || undefined
      });
      generatedKeys.push(chave);
    }

    res.status(201).json({
      message: `${generatedKeys.length} chaves geradas com sucesso`,
      keys: generatedKeys,
      cargoAtribuido,
      validade,
      cursoRestrito
    });
  } catch (error) {
    console.error('Erro ao gerar serial keys:', error);
    res.status(500).json({ message: 'Erro ao gerar serial keys' });
  }
};

// @desc    Obter serial key por ID (Admin)
// @route   GET /api/serial-keys/:id
// @access  Private/Admin
export const getSerialKeyById = async (req: Request, res: Response) => {
  try {
    const key = await SerialKey.findById(req.params.id)
      .populate('usadaPor', 'nomeCompleto email cpf crm');

    if (!key) {
      return res.status(404).json({ message: 'Serial key não encontrada' });
    }

    res.json(key);
  } catch (error) {
    console.error('Erro ao buscar serial key:', error);
    res.status(500).json({ message: 'Erro ao buscar serial key' });
  }
};

// @desc    Deletar serial key (Admin) - Remove também do histórico do usuário
// @route   DELETE /api/serial-keys/:id
// @access  Private/Admin
export const deleteSerialKey = async (req: Request, res: Response) => {
  try {
    const key = await SerialKey.findById(req.params.id);

    if (!key) {
      return res.status(404).json({ message: 'Serial key não encontrada' });
    }

    // Se a chave foi usada, remover do histórico do usuário
    if (key.usadaPor) {
      await User.findByIdAndUpdate(key.usadaPor, {
        $pull: { serialKeysUsadas: key._id }
      });
    }

    await SerialKey.findByIdAndDelete(req.params.id);

    res.json({ message: 'Serial key deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar serial key:', error);
    res.status(500).json({ message: 'Erro ao deletar serial key' });
  }
};

// @desc    Deletar todas as serial keys (Admin) - Remove também do histórico dos usuários
// @route   DELETE /api/serial-keys/all
// @access  Private/Admin
export const deleteAllSerialKeys = async (req: Request, res: Response) => {
  try {
    // Remover todas as serial keys do histórico de todos os usuários
    await User.updateMany(
      { serialKeysUsadas: { $exists: true, $ne: [] } },
      { $set: { serialKeysUsadas: [] } }
    );

    // Deletar todas as serial keys
    const result = await SerialKey.deleteMany({});

    res.json({
      message: `${result.deletedCount} serial keys deletadas com sucesso`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Erro ao deletar todas as serial keys:', error);
    res.status(500).json({ message: 'Erro ao deletar serial keys' });
  }
};

// @desc    Renovar validade de serial key (Admin)
// @route   PUT /api/serial-keys/:id/renew
// @access  Private/Admin
export const renewSerialKey = async (req: Request, res: Response) => {
  try {
    const { validadeDias } = req.body;

    if (!validadeDias) {
      return res.status(400).json({ message: 'Dias de validade são obrigatórios' });
    }

    const key = await SerialKey.findById(req.params.id);

    if (!key) {
      return res.status(404).json({ message: 'Serial key não encontrada' });
    }

    if (key.status === 'usada') {
      return res.status(400).json({ message: 'Não é possível renovar uma chave já utilizada' });
    }

    const novaValidade = new Date();
    novaValidade.setDate(novaValidade.getDate() + Number(validadeDias));

    key.validade = novaValidade;
    key.status = 'pendente';
    await key.save();

    res.json({ message: 'Validade renovada com sucesso', validade: novaValidade });
  } catch (error) {
    console.error('Erro ao renovar serial key:', error);
    res.status(500).json({ message: 'Erro ao renovar serial key' });
  }
};

// @desc    Exportar serial keys para CSV (Admin)
// @route   GET /api/serial-keys/export
// @access  Private/Admin
export const exportSerialKeys = async (req: Request, res: Response) => {
  try {
    const { status, cargoAtribuido } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (cargoAtribuido) query.cargoAtribuido = cargoAtribuido;

    const keys = await SerialKey.find(query)
      .populate('usadaPor', 'nomeCompleto email')
      .sort({ createdAt: -1 });

    // Criar CSV
    let csv = 'Chave,Cargo,Data Criação,Data Validade,Status,Usada Por,Email Usuário,Data Uso\n';

    keys.forEach((key) => {
      const usadaPor = key.usadaPor as any;
      csv += `${key.chave},${key.cargoAtribuido},${key.createdAt.toLocaleDateString('pt-BR')},`;
      csv += `${key.validade.toLocaleDateString('pt-BR')},${key.status},`;
      csv += `${usadaPor?.nomeCompleto || '-'},${usadaPor?.email || '-'},`;
      csv += `${key.dataUso ? key.dataUso.toLocaleDateString('pt-BR') : '-'}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=serial-keys-${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // BOM para Excel reconhecer UTF-8
  } catch (error) {
    console.error('Erro ao exportar serial keys:', error);
    res.status(500).json({ message: 'Erro ao exportar serial keys' });
  }
};

// @desc    Estatísticas de serial keys (Admin)
// @route   GET /api/serial-keys/stats
// @access  Private/Admin
export const getSerialKeyStats = async (req: Request, res: Response) => {
  try {
    const [total, usadas, pendentes, expiradas, porCargo] = await Promise.all([
      SerialKey.countDocuments(),
      SerialKey.countDocuments({ status: 'usada' }),
      SerialKey.countDocuments({ status: 'pendente' }),
      SerialKey.countDocuments({ status: 'expirada' }),
      SerialKey.aggregate([
        { $group: { _id: '$cargoAtribuido', count: { $sum: 1 } } }
      ])
    ]);

    const distribution: Record<string, number> = {};
    porCargo.forEach((item: any) => {
      distribution[item._id] = item.count;
    });

    res.json({
      total,
      usadas,
      pendentes,
      expiradas,
      distribution
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
};

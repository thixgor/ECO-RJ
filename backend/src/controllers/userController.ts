import { Request, Response } from 'express';
import User from '../models/User';
import SerialKey from '../models/SerialKey';
import Course from '../models/Course';
import { AuthRequest } from '../middleware/auth';

// @desc    Listar todos os usuários (Admin)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { cargo, ativo, search, page = 1, limit = 20 } = req.query;

    const query: any = {};

    if (cargo) {
      query.cargo = cargo;
    }

    if (ativo !== undefined) {
      query.ativo = ativo === 'true';
    }

    if (search) {
      query.$or = [
        { nomeCompleto: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } },
        { crm: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
};

// @desc    Obter usuário por ID (Admin)
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('cursosInscritos', 'titulo')
      .populate('serialKeysUsadas', 'chave cargoAtribuido dataUso');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar usuário' });
  }
};

// @desc    Atualizar cargo do usuário (Admin)
// @route   PUT /api/users/:id/cargo
// @access  Private/Admin
export const updateUserCargo = async (req: Request, res: Response) => {
  try {
    const { cargo } = req.body;
    const validCargos = ['Visitante', 'Aluno', 'Instrutor', 'Administrador'];

    if (!validCargos.includes(cargo)) {
      return res.status(400).json({ message: 'Cargo inválido' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { cargo },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar cargo:', error);
    res.status(500).json({ message: 'Erro ao atualizar cargo' });
  }
};

// @desc    Ativar/Desativar usuário (Admin)
// @route   PUT /api/users/:id/status
// @access  Private/Admin
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    user.ativo = !user.ativo;
    await user.save();

    res.json({ message: `Usuário ${user.ativo ? 'ativado' : 'desativado'} com sucesso`, ativo: user.ativo });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ message: 'Erro ao alterar status do usuário' });
  }
};

// @desc    Deletar usuário (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Não permitir deletar a si mesmo
    if (user._id.toString() === req.user?._id.toString()) {
      return res.status(400).json({ message: 'Você não pode deletar sua própria conta' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ message: 'Erro ao deletar usuário' });
  }
};

// @desc    Aplicar serial key no perfil
// @route   POST /api/users/apply-key
// @access  Private
export const applySerialKey = async (req: AuthRequest, res: Response) => {
  try {
    const { chave } = req.body;

    if (!chave) {
      return res.status(400).json({ message: 'Chave é obrigatória' });
    }

    // Buscar a serial key
    const serialKey = await SerialKey.findOne({ chave: chave.toUpperCase() });

    if (!serialKey) {
      return res.status(400).json({ message: 'Chave inválida' });
    }

    if (serialKey.status === 'usada') {
      return res.status(400).json({ message: 'Esta chave já foi utilizada' });
    }

    if (serialKey.status === 'expirada' || serialKey.validade < new Date()) {
      return res.status(400).json({ message: 'Esta chave está expirada' });
    }

    // Atualizar usuário com novo cargo
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    user.cargo = serialKey.cargoAtribuido as any;
    user.serialKeysUsadas.push(serialKey._id as any);
    await user.save();

    // Se a chave tem um curso restrito associado, dar acesso ao usuário
    let cursoNome = '';
    if (serialKey.cursoRestrito) {
      const course = await Course.findById(serialKey.cursoRestrito);
      if (course && course.acessoRestrito) {
        // Adicionar usuário à lista de alunos autorizados se ainda não estiver
        if (!course.alunosAutorizados.includes(user._id as any)) {
          course.alunosAutorizados.push(user._id as any);
          await course.save();
        }
        // Inscrever o usuário no curso se ainda não estiver inscrito
        if (!user.cursosInscritos.includes(course._id as any)) {
          user.cursosInscritos.push(course._id as any);
          await user.save();
        }
        cursoNome = course.titulo;
      }
    }

    // Marcar chave como usada
    serialKey.status = 'usada';
    serialKey.usadaPor = user._id as any;
    serialKey.dataUso = new Date();
    await serialKey.save();

    const message = cursoNome
      ? `Cargo atualizado para ${serialKey.cargoAtribuido} e acesso liberado ao curso "${cursoNome}"`
      : `Cargo atualizado com sucesso para ${serialKey.cargoAtribuido}`;

    res.json({
      message,
      cargo: user.cargo,
      cursoLiberado: cursoNome || undefined
    });
  } catch (error) {
    console.error('Erro ao aplicar serial key:', error);
    res.status(500).json({ message: 'Erro ao aplicar serial key' });
  }
};

// @desc    Obter estatísticas de usuários (Admin)
// @route   GET /api/users/stats
// @access  Private/Admin
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      cargoDistribution,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({
        ultimoLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      User.aggregate([
        { $group: { _id: '$cargo', count: { $sum: 1 } } }
      ]),
      User.find()
        .select('nomeCompleto email cargo createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const distribution: Record<string, number> = {};
    cargoDistribution.forEach((item: any) => {
      distribution[item._id] = item.count;
    });

    res.json({
      totalUsers,
      activeUsers,
      cargoDistribution: distribution,
      recentUsers
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
};

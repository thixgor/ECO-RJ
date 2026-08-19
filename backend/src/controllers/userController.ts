import { Request, Response } from 'express';
import User from '../models/User';
import SerialKey from '../models/SerialKey';
import Course from '../models/Course';
import { AuthRequest } from '../middleware/auth';
import { Cargo, maiorCargo, isCargoValido } from '../config/roles';
import { escapeRegex } from '../utils/validators';

// @desc    Listar todos os usuários (Admin)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { cargo, tipoUsuario, estado, ativo, search, page = 1, limit = 20 } = req.query;

    const query: any = {};

    if (cargo) {
      query.cargo = cargo;
    }

    if (tipoUsuario) {
      query.tipoUsuario = tipoUsuario;
    }

    if (estado) {
      query.estado = String(estado).toUpperCase();
    }

    if (ativo !== undefined) {
      query.ativo = ativo === 'true';
    }

    if (search) {
      // O termo é escapado antes de virar regex. Sem isso, buscar por um CPF
      // formatado ("123.456...") casava com qualquer caractere no lugar do ponto,
      // e um termo com parêntese solto derrubava a busca com erro de sintaxe.
      const termo = escapeRegex(String(search).trim());
      query.$or = [
        { nomeCompleto: { $regex: termo, $options: 'i' } },
        { email: { $regex: termo, $options: 'i' } },
        { cpf: { $regex: termo, $options: 'i' } },
        { crm: { $regex: termo, $options: 'i' } },
        { estado: { $regex: termo, $options: 'i' } },
        { especialidade: { $regex: termo, $options: 'i' } },
        { areaResidencia: { $regex: termo, $options: 'i' } },
        { hospital: { $regex: termo, $options: 'i' } },
        { instituicao: { $regex: termo, $options: 'i' } }
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

/**
 * Impede que a última conta de Administrador ATIVA seja rebaixada, desativada ou
 * apagada. Sem essa checagem, um clique no painel deixava a plataforma sem
 * nenhum administrador — e a única saída seria mexer direto no banco.
 *
 * @returns a mensagem de erro, ou `null` quando a operação é segura.
 */
const bloqueiaSeUltimoAdmin = async (
  usuario: { _id: any; cargo: string; ativo: boolean },
  acao: string
): Promise<string | null> => {
  if (usuario.cargo !== 'Administrador' || !usuario.ativo) return null;

  const outrosAdmins = await User.countDocuments({
    _id: { $ne: usuario._id },
    cargo: 'Administrador',
    ativo: true
  });

  if (outrosAdmins > 0) return null;
  return `Esta é a única conta de administrador ativa. ${acao} deixaria a plataforma sem acesso ao painel. Promova outro usuário a Administrador antes.`;
};

// @desc    Atualizar cargo do usuário (Admin)
// @route   PUT /api/users/:id/cargo
// @access  Private/Admin
export const updateUserCargo = async (req: Request, res: Response) => {
  try {
    const { cargo } = req.body;

    if (!isCargoValido(cargo)) {
      return res.status(400).json({ message: 'Cargo inválido' });
    }

    const alvo = await User.findById(req.params.id).select('cargo ativo');
    if (!alvo) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (cargo !== 'Administrador') {
      const bloqueio = await bloqueiaSeUltimoAdmin(alvo, 'Alterar o cargo');
      if (bloqueio) return res.status(400).json({ message: bloqueio });
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

    if (user.ativo) {
      const bloqueio = await bloqueiaSeUltimoAdmin(user, 'Desativar a conta');
      if (bloqueio) return res.status(400).json({ message: bloqueio });
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

    const bloqueio = await bloqueiaSeUltimoAdmin(user, 'Excluir a conta');
    if (bloqueio) return res.status(400).json({ message: bloqueio });

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

    const codigo = String(chave).trim().toUpperCase();

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // CLAIM ATÔMICO da chave.
    //
    // A versão anterior conferia o status no início e só gravava `usada` no fim,
    // depois de vários `await`. Duas requisições simultâneas — dois cliques no
    // botão, a mesma chave repassada a duas pessoas, duas instâncias serverless —
    // passavam as duas pela verificação e a chave era consumida mais de uma vez,
    // contrariando a regra de uso único. Marcar a chave em uma única operação
    // condicional garante que apenas um pedido vença a disputa.
    const serialKey = await SerialKey.findOneAndUpdate(
      {
        chave: codigo,
        status: { $nin: ['usada', 'expirada'] },
        validade: { $gte: new Date() }
      },
      { $set: { status: 'usada', usadaPor: user._id, dataUso: new Date() } },
      { new: true }
    );

    // Sem claim: ou a chave não existe, ou já foi usada/expirou. A mensagem é
    // diferenciada relendo o documento — apenas para informar o usuário.
    if (!serialKey) {
      const existente = await SerialKey.findOne({ chave: codigo }).select('status validade');
      if (!existente) {
        return res.status(400).json({ message: 'Chave inválida' });
      }
      if (existente.status === 'usada') {
        return res.status(400).json({ message: 'Esta chave já foi utilizada' });
      }
      return res.status(400).json({ message: 'Esta chave está expirada' });
    }

    // Promove o cargo SEM rebaixar: uma chave de "Aluno" nunca deve rebaixar
    // um Instrutor ou Administrador que por acaso ativar a chave.
    const cargoAnterior = user.cargo as Cargo;
    user.cargo = maiorCargo(cargoAnterior, serialKey.cargoAtribuido as Cargo);
    // `$addToSet` no array em memória: reaplicar não deve duplicar o histórico.
    const chaveId = (serialKey._id as any).toString();
    if (!user.serialKeysUsadas.some((k) => k.toString() === chaveId)) {
      user.serialKeysUsadas.push(serialKey._id as any);
    }
    await user.save();

    // Se a chave está vinculada a um curso, inscreve o usuário nesse curso.
    let cursoNome = '';
    if (serialKey.cursoRestrito) {
      const course = await Course.findById(serialKey.cursoRestrito);
      if (course) {
        const courseIdStr = (course._id as any).toString();
        const userIdStr = (user._id as any).toString();
        // Inscreve no curso para que ele apareça em "Meus Cursos"
        if (!user.cursosInscritos.some((c) => c.toString() === courseIdStr)) {
          user.cursosInscritos.push(course._id as any);
          await user.save();
        }
        // Cursos restritos exigem estar na lista de autorizados
        if (course.acessoRestrito && !course.alunosAutorizados.some((a) => a.toString() === userIdStr)) {
          course.alunosAutorizados.push(user._id as any);
          await course.save();
        }
        cursoNome = course.titulo;
      }
    }

    // (a chave já foi marcada como usada no claim atômico acima)

    const promovido = user.cargo !== cargoAnterior;
    let message: string;
    if (cursoNome && promovido) {
      message = `Tudo certo! Você agora é ${user.cargo} e o curso "${cursoNome}" já está liberado na sua conta.`;
    } else if (cursoNome) {
      message = `Acesso ao curso "${cursoNome}" liberado na sua conta.`;
    } else if (promovido) {
      message = `Tudo certo! Seu cargo foi atualizado para ${user.cargo}.`;
    } else {
      message = 'Chave aplicada com sucesso.';
    }

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

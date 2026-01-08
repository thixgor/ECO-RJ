import { Request, Response } from 'express';
import ForumTopic from '../models/ForumTopic';
import SystemSettings from '../models/SystemSettings';
import { AuthRequest } from '../middleware/auth';

// @desc    Listar tópicos do fórum
// @route   GET /api/forum
// @access  Private
export const getTopics = async (req: Request, res: Response) => {
  try {
    const { cursoId, search, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (cursoId) query.cursoId = cursoId;
    if (search) {
      query.$text = { $search: search as string };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [topics, total] = await Promise.all([
      ForumTopic.find(query)
        .populate('autor', 'nomeCompleto fotoPerfil cargo')
        .populate('cursoId', 'titulo')
        .sort({ fixado: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ForumTopic.countDocuments(query)
    ]);

    // Adicionar contagem de respostas
    const topicsWithCount = topics.map((topic) => ({
      ...topic.toObject(),
      totalRespostas: topic.respostas.length
    }));

    res.json({
      topics: topicsWithCount,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar tópicos:', error);
    res.status(500).json({ message: 'Erro ao listar tópicos' });
  }
};

// @desc    Obter tópico por ID
// @route   GET /api/forum/:id
// @access  Private
export const getTopicById = async (req: Request, res: Response) => {
  try {
    const topic = await ForumTopic.findById(req.params.id)
      .populate('autor', 'nomeCompleto fotoPerfil cargo')
      .populate('cursoId', 'titulo')
      .populate('respostas.autor', 'nomeCompleto fotoPerfil cargo');

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    res.json(topic);
  } catch (error) {
    console.error('Erro ao buscar tópico:', error);
    res.status(500).json({ message: 'Erro ao buscar tópico' });
  }
};

// @desc    Criar novo tópico
// @route   POST /api/forum
// @access  Private
export const createTopic = async (req: AuthRequest, res: Response) => {
  try {
    const { titulo, conteudo, cursoId, imagem, embedVideo } = req.body;

    if (!titulo || !conteudo) {
      return res.status(400).json({ message: 'Título e conteúdo são obrigatórios' });
    }

    const userCargo = req.user?.cargo || '';

    // Verificar se fórum está bloqueado para alunos
    const forumLocked = await SystemSettings.findOne({ key: 'forum_locked' });
    if (forumLocked?.value === true && userCargo === 'Aluno') {
      return res.status(403).json({
        message: 'O fórum está temporariamente bloqueado para novos posts. Apenas administradores e instrutores podem postar.'
      });
    }

    // Verificar permissão de usar fórum
    const allowedRoles = ['Aluno', 'Instrutor', 'Administrador'];
    if (!allowedRoles.includes(userCargo)) {
      return res.status(403).json({
        message: 'Você precisa ser um aluno para usar o fórum. Aplique uma serial key válida no seu perfil.'
      });
    }

    // Verificar permissão para imagem e vídeo (apenas admin/instrutor)
    const canAddMedia = ['Instrutor', 'Administrador'].includes(userCargo);

    const topicData: any = {
      titulo,
      conteudo,
      autor: req.user?._id,
      cursoId: cursoId || null
    };

    // Só adiciona imagem/vídeo se tiver permissão
    if (canAddMedia) {
      if (imagem) topicData.imagem = imagem;
      if (embedVideo) topicData.embedVideo = embedVideo;
    }

    const topic = await ForumTopic.create(topicData);

    const populatedTopic = await ForumTopic.findById(topic._id)
      .populate('autor', 'nomeCompleto fotoPerfil cargo')
      .populate('cursoId', 'titulo');

    res.status(201).json(populatedTopic);
  } catch (error) {
    console.error('Erro ao criar tópico:', error);
    res.status(500).json({ message: 'Erro ao criar tópico' });
  }
};

// @desc    Responder tópico
// @route   POST /api/forum/:id/reply
// @access  Private
export const replyTopic = async (req: AuthRequest, res: Response) => {
  try {
    const { conteudo, imagem, embedVideo } = req.body;

    if (!conteudo) {
      return res.status(400).json({ message: 'Conteúdo da resposta é obrigatório' });
    }

    const topic = await ForumTopic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    if (topic.fechado) {
      return res.status(400).json({ message: 'Este tópico está fechado para novas respostas' });
    }

    const userCargo = req.user?.cargo || '';

    // Verificar se fórum está bloqueado para alunos
    const forumLocked = await SystemSettings.findOne({ key: 'forum_locked' });
    if (forumLocked?.value === true && userCargo === 'Aluno') {
      return res.status(403).json({
        message: 'O fórum está temporariamente bloqueado para novos posts. Apenas administradores e instrutores podem postar.'
      });
    }

    // Verificar permissão de usar fórum
    const allowedRoles = ['Aluno', 'Instrutor', 'Administrador'];
    if (!allowedRoles.includes(userCargo)) {
      return res.status(403).json({
        message: 'Você precisa ser um aluno para usar o fórum'
      });
    }

    // Verificar permissão para imagem e vídeo (apenas admin/instrutor)
    const canAddMedia = ['Instrutor', 'Administrador'].includes(userCargo);

    const replyData: any = {
      autor: req.user?._id as any,
      conteudo,
      createdAt: new Date()
    };

    // Só adiciona imagem/vídeo se tiver permissão
    if (canAddMedia) {
      if (imagem) replyData.imagem = imagem;
      if (embedVideo) replyData.embedVideo = embedVideo;
    }

    topic.respostas.push(replyData);
    await topic.save();

    const updatedTopic = await ForumTopic.findById(topic._id)
      .populate('autor', 'nomeCompleto fotoPerfil cargo')
      .populate('cursoId', 'titulo')
      .populate('respostas.autor', 'nomeCompleto fotoPerfil cargo');

    res.json(updatedTopic);
  } catch (error) {
    console.error('Erro ao responder tópico:', error);
    res.status(500).json({ message: 'Erro ao responder tópico' });
  }
};

// @desc    Editar tópico (autor dentro de 10 min ou admin)
// @route   PUT /api/forum/:id
// @access  Private
export const updateTopic = async (req: AuthRequest, res: Response) => {
  try {
    const { titulo, conteudo, imagem, embedVideo } = req.body;

    const topic = await ForumTopic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    // Verificar se é o autor ou admin
    const isAuthor = topic.autor.toString() === req.user?._id.toString();
    const isAdmin = req.user?.cargo === 'Administrador';
    const isInstructor = req.user?.cargo === 'Instrutor';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: 'Você não tem permissão para editar este tópico' });
    }

    // Se for autor (não admin/instrutor), verificar limite de 10 minutos
    if (isAuthor && !isAdmin && !isInstructor) {
      const createdAt = new Date(topic.createdAt).getTime();
      const now = Date.now();
      const tenMinutesInMs = 10 * 60 * 1000;

      if (now - createdAt > tenMinutesInMs) {
        return res.status(403).json({
          message: 'O tempo limite de 10 minutos para edição expirou'
        });
      }
    }

    if (titulo) topic.titulo = titulo;
    if (conteudo) topic.conteudo = conteudo;

    // Apenas admin/instrutor podem adicionar/editar mídia
    if (isAdmin || isInstructor) {
      if (imagem !== undefined) topic.imagem = imagem || undefined;
      if (embedVideo !== undefined) topic.embedVideo = embedVideo || undefined;
    }

    await topic.save();

    res.json(topic);
  } catch (error) {
    console.error('Erro ao editar tópico:', error);
    res.status(500).json({ message: 'Erro ao editar tópico' });
  }
};

// @desc    Deletar tópico (autor ou admin)
// @route   DELETE /api/forum/:id
// @access  Private
export const deleteTopic = async (req: AuthRequest, res: Response) => {
  try {
    const topic = await ForumTopic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    // Verificar se é o autor ou admin
    const isAuthor = topic.autor.toString() === req.user?._id.toString();
    const isAdmin = req.user?.cargo === 'Administrador';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: 'Você não tem permissão para deletar este tópico' });
    }

    await ForumTopic.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tópico deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar tópico:', error);
    res.status(500).json({ message: 'Erro ao deletar tópico' });
  }
};

// @desc    Deletar resposta de um tópico (autor da resposta ou admin)
// @route   DELETE /api/forum/:id/reply/:replyId
// @access  Private
export const deleteReply = async (req: AuthRequest, res: Response) => {
  try {
    const { id, replyId } = req.params;

    const topic = await ForumTopic.findById(id);

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    const replyIndex = topic.respostas.findIndex(
      (r) => r._id?.toString() === replyId
    );

    if (replyIndex === -1) {
      return res.status(404).json({ message: 'Resposta não encontrada' });
    }

    // Verificar se é o autor da resposta ou admin
    const reply = topic.respostas[replyIndex];
    const isAuthor = reply.autor.toString() === req.user?._id.toString();
    const isAdmin = req.user?.cargo === 'Administrador';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: 'Você não tem permissão para deletar esta resposta' });
    }

    topic.respostas.splice(replyIndex, 1);
    await topic.save();

    res.json({ message: 'Resposta deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar resposta:', error);
    res.status(500).json({ message: 'Erro ao deletar resposta' });
  }
};

// @desc    Fixar/Desafixar tópico (admin)
// @route   PUT /api/forum/:id/pin
// @access  Private/Admin
export const togglePinTopic = async (req: Request, res: Response) => {
  try {
    const topic = await ForumTopic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    topic.fixado = !topic.fixado;
    await topic.save();

    res.json({ message: `Tópico ${topic.fixado ? 'fixado' : 'desafixado'} com sucesso`, fixado: topic.fixado });
  } catch (error) {
    console.error('Erro ao fixar tópico:', error);
    res.status(500).json({ message: 'Erro ao fixar tópico' });
  }
};

// @desc    Fechar/Abrir tópico (admin)
// @route   PUT /api/forum/:id/close
// @access  Private/Admin
export const toggleCloseTopic = async (req: Request, res: Response) => {
  try {
    const topic = await ForumTopic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    topic.fechado = !topic.fechado;
    await topic.save();

    res.json({ message: `Tópico ${topic.fechado ? 'fechado' : 'aberto'} com sucesso`, fechado: topic.fechado });
  } catch (error) {
    console.error('Erro ao fechar tópico:', error);
    res.status(500).json({ message: 'Erro ao fechar tópico' });
  }
};

// @desc    Bloquear/Desbloquear fórum para alunos (admin)
// @route   PUT /api/forum/settings/lock
// @access  Private/Admin
export const toggleForumLock = async (req: AuthRequest, res: Response) => {
  try {
    const currentSetting = await SystemSettings.findOne({ key: 'forum_locked' });
    const newValue = !(currentSetting?.value === true);

    await SystemSettings.findOneAndUpdate(
      { key: 'forum_locked' },
      { value: newValue, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.json({
      message: newValue
        ? 'Fórum bloqueado. Apenas administradores e instrutores podem postar.'
        : 'Fórum desbloqueado. Todos os alunos podem postar.',
      locked: newValue
    });
  } catch (error) {
    console.error('Erro ao alterar configuração do fórum:', error);
    res.status(500).json({ message: 'Erro ao alterar configuração' });
  }
};

// @desc    Obter status do fórum
// @route   GET /api/forum/settings/status
// @access  Private
export const getForumStatus = async (req: Request, res: Response) => {
  try {
    const forumLocked = await SystemSettings.findOne({ key: 'forum_locked' });

    res.json({
      locked: forumLocked?.value === true
    });
  } catch (error) {
    console.error('Erro ao obter status do fórum:', error);
    res.status(500).json({ message: 'Erro ao obter status' });
  }
};

// @desc    Obter meus tópicos
// @route   GET /api/forum/my-topics
// @access  Private
export const getMyTopics = async (req: AuthRequest, res: Response) => {
  try {
    const topics = await ForumTopic.find({ autor: req.user?._id })
      .populate('cursoId', 'titulo')
      .sort({ createdAt: -1 });

    res.json(topics);
  } catch (error) {
    console.error('Erro ao buscar meus tópicos:', error);
    res.status(500).json({ message: 'Erro ao buscar meus tópicos' });
  }
};

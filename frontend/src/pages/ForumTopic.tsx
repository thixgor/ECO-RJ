import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Clock, MessageSquare, Pin, Lock, Send, Trash2, Image, Video, X, Upload, Edit3 } from 'lucide-react';
import { forumService } from '../services/api';
import { ForumTopic as ForumTopicType, User as UserType, ForumReply } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const ForumTopic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<ForumTopicType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState('');
  const [replyVideo, setReplyVideo] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [forumLocked, setForumLocked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isInstructor = user?.cargo === 'Instrutor';
  const canAddMedia = isAdmin || isInstructor;
  const canUseForum = ['Aluno', 'Instrutor', 'Administrador'].includes(user?.cargo || '');
  const canPost = canUseForum && (!forumLocked || isAdmin || isInstructor);

  // Verifica se usuário é o autor do tópico
  const isTopicAuthor = topic && user && (topic.autor as UserType)?._id === user._id;

  // Verifica se ainda pode editar (dentro de 10 minutos)
  const canEditTopic = () => {
    if (!topic || !isTopicAuthor) return false;
    if (isAdmin || isInstructor) return true; // Admin/Instrutor sempre pode editar
    const createdAt = new Date(topic.createdAt).getTime();
    const now = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000;
    return now - createdAt <= tenMinutesInMs;
  };

  // Calcula tempo restante para edição
  const getEditTimeRemaining = () => {
    if (!topic) return 0;
    const createdAt = new Date(topic.createdAt).getTime();
    const now = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000;
    const remaining = tenMinutesInMs - (now - createdAt);
    return Math.max(0, Math.floor(remaining / 1000 / 60)); // minutos restantes
  };

  useEffect(() => {
    if (id) {
      loadTopic();
      loadForumStatus();
    }
  }, [id]);

  const loadTopic = async () => {
    try {
      const response = await forumService.getTopicById(id!);
      setTopic(response.data);
    } catch (error) {
      console.error('Erro ao carregar tópico:', error);
      toast.error('Erro ao carregar tópico');
    } finally {
      setIsLoading(false);
    }
  };

  const loadForumStatus = async () => {
    try {
      const response = await forumService.getStatus();
      setForumLocked(response.data.locked);
    } catch (error) {
      console.error('Erro ao carregar status do fórum:', error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) {
      toast.error('Digite sua resposta');
      return;
    }

    setIsReplying(true);
    try {
      const data: any = { conteudo: replyContent };
      if (canAddMedia && replyImage) data.imagem = replyImage;
      if (canAddMedia && replyVideo) data.embedVideo = replyVideo;

      await forumService.replyTopic(id!, data);
      setReplyContent('');
      setReplyImage('');
      setReplyVideo('');
      setShowImageInput(false);
      setShowVideoInput(false);
      loadTopic();
      toast.success('Resposta enviada!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao responder');
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este tópico?')) return;

    try {
      await forumService.deleteTopic(id!);
      toast.success('Tópico deletado');
      navigate('/forum');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar');
    }
  };

  const startEditing = () => {
    if (!topic) return;
    setEditTitle(topic.titulo);
    setEditContent(topic.conteudo);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  const handleEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      await forumService.updateTopic(id!, { titulo: editTitle, conteudo: editContent });
      loadTopic();
      setIsEditing(false);
      toast.success('Tópico atualizado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao editar');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta resposta?')) return;

    try {
      await forumService.deleteReply(id!, replyId);
      loadTopic();
      toast.success('Resposta deletada');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar resposta');
    }
  };

  const handleTogglePin = async () => {
    try {
      await forumService.togglePin(id!);
      loadTopic();
      toast.success(topic?.fixado ? 'Tópico desafixado' : 'Tópico fixado');
    } catch (error) {
      toast.error('Erro ao alterar fixação');
    }
  };

  const handleToggleClose = async () => {
    try {
      await forumService.toggleClose(id!);
      loadTopic();
      toast.success(topic?.fechado ? 'Tópico aberto' : 'Tópico fechado');
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setReplyImage(base64);
      setShowImageInput(true);
    };
    reader.readAsDataURL(file);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <Loading size="lg" text="Carregando tópico..." />;
  }

  if (!topic) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Tópico não encontrado</h2>
        <Link to="/forum" className="btn btn-primary">
          Voltar ao Fórum
        </Link>
      </div>
    );
  }

  const autor = topic.autor as UserType;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <Link to="/forum" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-primary-500 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Fórum
      </Link>

      {/* Topic */}
      <div className="card">
        <div className="p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              {topic.fixado && (
                <span className="px-2 py-1 bg-primary-500/10 text-primary-500 text-xs rounded border border-primary-500/20">
                  <Pin className="w-3 h-3 inline mr-1" />
                  Fixado
                </span>
              )}
              {topic.fechado && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-[var(--color-text-muted)] text-xs rounded border border-gray-200 dark:border-white/10">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Fechado
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {/* Botões Admin */}
              {isAdmin && (
                <>
                  <button
                    onClick={handleTogglePin}
                    className="btn btn-outline text-sm py-1 px-3"
                  >
                    <Pin className="w-4 h-4" />
                    <span className="hidden sm:inline">{topic.fixado ? 'Desafixar' : 'Fixar'}</span>
                  </button>
                  <button
                    onClick={handleToggleClose}
                    className="btn btn-outline text-sm py-1 px-3"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">{topic.fechado ? 'Abrir' : 'Fechar'}</span>
                  </button>
                </>
              )}
              {/* Botão de Editar (autor ou admin) */}
              {(isTopicAuthor || isAdmin) && canEditTopic() && !isEditing && (
                <button
                  onClick={startEditing}
                  className="btn btn-outline text-sm py-1 px-3"
                  title={!isAdmin && !isInstructor ? `${getEditTimeRemaining()} min restantes` : 'Editar'}
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              )}
              {/* Botão de Deletar (autor ou admin) */}
              {(isTopicAuthor || isAdmin) && (
                <button
                  onClick={handleDelete}
                  className="btn bg-red-500/10 text-red-600 hover:bg-red-500/20 text-sm py-1 px-3 border border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Deletar</span>
                </button>
              )}
            </div>
          </div>

          {/* Aviso de tempo restante para edição */}
          {isTopicAuthor && !isAdmin && !isInstructor && canEditTopic() && !isEditing && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              <Clock className="w-3 h-3 inline mr-1" />
              Você pode editar este post por mais {getEditTimeRemaining()} minuto(s)
            </div>
          )}

          {/* Form de edição */}
          {isEditing ? (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input w-full"
                placeholder="Título do tópico"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="input w-full min-h-[120px]"
                placeholder="Conteúdo do tópico"
              />
              <div className="flex gap-2">
                <button onClick={handleEdit} className="btn btn-primary text-sm">
                  Salvar
                </button>
                <button onClick={cancelEditing} className="btn btn-outline text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)] mt-4">
              {topic.titulo}
            </h1>
          )}

          <div className="flex items-center gap-4 mt-4">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-500/20 rounded-full flex items-center justify-center">
              {autor?.fotoPerfil ? (
                <img src={autor.fotoPerfil} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <User className="w-5 h-5 text-primary-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">{autor?.nomeCompleto || 'Anônimo'}</p>
              <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(topic.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {!isEditing && (
          <div className="p-6 space-y-4">
            <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">{topic.conteudo}</p>

            {/* Topic Image */}
            {topic.imagem && (
              <img
                src={topic.imagem}
                alt="Imagem do tópico"
                className="max-w-full rounded-lg border border-[var(--glass-border)]"
                loading="lazy"
                decoding="async"
              />
            )}

            {/* Topic Video */}
            {topic.embedVideo && (
              <div
                className="aspect-video max-w-2xl rounded-lg overflow-hidden bg-black"
                dangerouslySetInnerHTML={{ __html: topic.embedVideo }}
              />
            )}
          </div>
        )}
      </div>

      {/* Replies */}
      <div className="card">
        <div className="p-6 border-b border-[var(--glass-border)]">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2 text-[var(--color-text-primary)]">
            <MessageSquare className="w-5 h-5 text-primary-500" />
            Respostas ({topic.respostas?.length || 0})
          </h2>
        </div>

        <div className="divide-y divide-[var(--glass-border)]">
          {topic.respostas && topic.respostas.length > 0 ? (
            topic.respostas.map((reply: ForumReply) => {
              const replyAutor = reply.autor as UserType;
              const isReplyAuthor = user && replyAutor?._id === user._id;
              const canDeleteReply = isAdmin || isReplyAuthor;

              return (
                <div key={reply._id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {replyAutor?.fotoPerfil ? (
                        <img src={replyAutor.fotoPerfil} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <User className="w-5 h-5 text-[var(--color-text-muted)]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[var(--color-text-primary)]">{replyAutor?.nomeCompleto || 'Anônimo'}</span>
                          {replyAutor?.cargo && (
                            <span className={`text-xs px-2 py-0.5 rounded ${replyAutor.cargo === 'Administrador'
                                ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                : replyAutor.cargo === 'Instrutor'
                                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                  : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-[var(--color-text-muted)]'
                              }`}>
                              {replyAutor.cargo}
                            </span>
                          )}
                          <span className="text-sm text-[var(--color-text-muted)]">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        {canDeleteReply && (
                          <button
                            onClick={() => handleDeleteReply(reply._id)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                            title="Deletar resposta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">{reply.conteudo}</p>

                      {/* Reply Image */}
                      {reply.imagem && (
                        <img
                          src={reply.imagem}
                          alt="Imagem da resposta"
                          className="max-w-full mt-3 rounded-lg border border-[var(--glass-border)]"
                          loading="lazy"
                          decoding="async"
                        />
                      )}

                      {/* Reply Video */}
                      {reply.embedVideo && (
                        <div
                          className="aspect-video max-w-xl mt-3 rounded-lg overflow-hidden bg-black"
                          dangerouslySetInnerHTML={{ __html: reply.embedVideo }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-[var(--color-text-muted)]">
              Nenhuma resposta ainda. Seja o primeiro a responder!
            </div>
          )}
        </div>

        {/* Reply Form */}
        {canPost && !topic.fechado && (
          <div className="p-6 border-t border-[var(--glass-border)] bg-gray-50/50 dark:bg-white/5">
            <form onSubmit={handleReply} className="space-y-4">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="input min-h-[100px]"
                placeholder="Escreva sua resposta..."
                required
              />

              {/* Media Options (Admin/Instrutor only) */}
              {canAddMedia && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowImageInput(!showImageInput)}
                      className={`btn btn-sm ${showImageInput ? 'btn-primary' : 'btn-outline'}`}
                    >
                      <Image className="w-4 h-4" />
                      Imagem
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVideoInput(!showVideoInput)}
                      className={`btn btn-sm ${showVideoInput ? 'btn-primary' : 'btn-outline'}`}
                    >
                      <Video className="w-4 h-4" />
                      Vídeo
                    </button>
                  </div>

                  {/* Image Input */}
                  {showImageInput && (
                    <div className="space-y-2">
                      <label className="label">URL da Imagem</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyImage}
                          onChange={(e) => setReplyImage(e.target.value)}
                          className="input flex-1"
                          placeholder="https://exemplo.com/imagem.jpg"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-outline"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyImage('');
                            setShowImageInput(false);
                          }}
                          className="btn btn-outline text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        className="hidden"
                      />
                      {replyImage && (
                        <img src={replyImage} alt="Preview" className="max-h-48 rounded-lg" loading="lazy" decoding="async" />
                      )}
                    </div>
                  )}

                  {/* Video Embed Input */}
                  {showVideoInput && (
                    <div className="space-y-2">
                      <label className="label">Código Embed do Vídeo</label>
                      <div className="flex gap-2">
                        <textarea
                          value={replyVideo}
                          onChange={(e) => setReplyVideo(e.target.value)}
                          className="input flex-1 min-h-[80px]"
                          placeholder='<iframe src="https://www.youtube.com/embed/..." ...></iframe>'
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReplyVideo('');
                            setShowVideoInput(false);
                          }}
                          className="btn btn-outline text-red-500 self-start"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {replyVideo && (
                        <div
                          className="aspect-video max-w-md rounded-lg overflow-hidden bg-black"
                          dangerouslySetInnerHTML={{ __html: replyVideo }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isReplying}
                className="btn btn-primary"
              >
                <Send className="w-4 h-4" />
                {isReplying ? 'Enviando...' : 'Enviar Resposta'}
              </button>
            </form>
          </div>
        )}

        {topic.fechado && (
          <div className="p-6 border-t border-[var(--glass-border)] bg-gray-50 dark:bg-white/5 text-center text-[var(--color-text-muted)]">
            <Lock className="w-5 h-5 mx-auto mb-2" />
            Este tópico está fechado para novas respostas.
          </div>
        )}

        {forumLocked && !topic.fechado && user?.cargo === 'Aluno' && (
          <div className="p-6 border-t border-[var(--glass-border)] bg-amber-50 dark:bg-amber-500/10 text-center text-amber-800 dark:text-amber-400">
            <Lock className="w-5 h-5 mx-auto mb-2" />
            O fórum está temporariamente bloqueado para novos posts.
          </div>
        )}

        {!canUseForum && !topic.fechado && (
          <div className="p-6 border-t border-[var(--glass-border)] bg-yellow-50 dark:bg-amber-500/10 text-center text-yellow-800 dark:text-amber-400">
            <Link to="/perfil" className="underline font-medium">
              Aplique uma serial key
            </Link>{' '}
            para participar das discussões.
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumTopic;

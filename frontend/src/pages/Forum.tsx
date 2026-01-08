import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Search, Pin, Lock, Clock, User, Image, Video, X, Upload, LockKeyhole, Unlock } from 'lucide-react';
import { forumService } from '../services/api';
import { ForumTopic, User as UserType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LoadingPage } from '../components/common/Loading';
import toast from 'react-hot-toast';

const Forum: React.FC = () => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ titulo: '', conteudo: '', imagem: '', embedVideo: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [forumLocked, setForumLocked] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.cargo === 'Administrador';
  const isInstructor = user?.cargo === 'Instrutor';
  const canAddMedia = isAdmin || isInstructor;
  const canUseForum = ['Aluno', 'Instrutor', 'Administrador'].includes(user?.cargo || '');
  const canPost = canUseForum && (!forumLocked || isAdmin || isInstructor);

  useEffect(() => {
    loadTopics();
    loadForumStatus();
  }, []);

  const loadTopics = async () => {
    try {
      const response = await forumService.getTopics();
      setTopics(response.data.topics);
    } catch (error) {
      console.error('Erro ao carregar tópicos:', error);
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

  const handleToggleForumLock = async () => {
    try {
      const response = await forumService.toggleLock();
      setForumLocked(response.data.locked);
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar configuração');
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTopic.titulo.trim() || !newTopic.conteudo.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsCreating(true);
    try {
      const data: any = {
        titulo: newTopic.titulo,
        conteudo: newTopic.conteudo
      };
      if (canAddMedia && newTopic.imagem) data.imagem = newTopic.imagem;
      if (canAddMedia && newTopic.embedVideo) data.embedVideo = newTopic.embedVideo;

      await forumService.createTopic(data);
      setNewTopic({ titulo: '', conteudo: '', imagem: '', embedVideo: '' });
      setShowNewTopic(false);
      setShowImageInput(false);
      setShowVideoInput(false);
      loadTopics();
      toast.success('Tópico criado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar tópico');
    } finally {
      setIsCreating(false);
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

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setNewTopic({ ...newTopic, imagem: base64 });
      setShowImageInput(true);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canAddMedia) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canAddMedia) return;

    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const filteredTopics = topics.filter(topic =>
    topic.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.conteudo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    return d.toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Fórum</h1>
          <p className="text-[var(--color-text-secondary)]">Participe das discussões com outros alunos</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <button
              onClick={handleToggleForumLock}
              className={`btn ${forumLocked ? 'bg-amber-500 hover:bg-amber-600' : 'btn-outline'}`}
              title={forumLocked ? 'Desbloquear fórum' : 'Bloquear fórum para alunos'}
            >
              {forumLocked ? (
                <>
                  <LockKeyhole className="w-5 h-5" />
                  <span className="hidden sm:inline">Bloqueado</span>
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  <span className="hidden sm:inline">Aberto</span>
                </>
              )}
            </button>
          )}
          {canPost && (
            <button
              onClick={() => setShowNewTopic(!showNewTopic)}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5" />
              Novo Tópico
            </button>
          )}
        </div>
      </div>

      {/* Forum Locked Warning */}
      {forumLocked && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
          <LockKeyhole className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-amber-800 dark:text-amber-400">
            O fórum está temporariamente bloqueado. Apenas administradores e instrutores podem criar novos posts.
          </p>
        </div>
      )}

      {/* Access Warning */}
      {!canUseForum && (
        <div className="bg-yellow-50 dark:bg-amber-500/10 border border-yellow-200 dark:border-amber-500/30 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-amber-400">
            Você precisa ser um Aluno para participar do fórum.{' '}
            <Link to="/perfil" className="underline font-medium hover:text-amber-300">
              Aplique uma serial key no seu perfil
            </Link>.
          </p>
        </div>
      )}

      {/* New Topic Form */}
      {showNewTopic && canPost && (
        <div
          className={`card p-6 animate-slide-down ${isDragging ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <h2 className="font-heading text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Criar Novo Tópico</h2>
          <form onSubmit={handleCreateTopic} className="space-y-4">
            <div>
              <label className="label">Título</label>
              <input
                type="text"
                value={newTopic.titulo}
                onChange={(e) => setNewTopic({ ...newTopic, titulo: e.target.value })}
                className="input"
                placeholder="Título do seu tópico"
                required
              />
            </div>
            <div>
              <label className="label">Conteúdo</label>
              <textarea
                value={newTopic.conteudo}
                onChange={(e) => setNewTopic({ ...newTopic, conteudo: e.target.value })}
                className="input min-h-[150px]"
                placeholder="Descreva sua dúvida ou discussão..."
                required
              />
            </div>

            {/* Media Options (Admin/Instrutor only) */}
            {canAddMedia && (
              <div className="space-y-4 border-t border-[var(--glass-border)] pt-4">
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
                    <label className="label">URL da Imagem ou arraste um arquivo</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTopic.imagem}
                        onChange={(e) => setNewTopic({ ...newTopic, imagem: e.target.value })}
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
                          setNewTopic({ ...newTopic, imagem: '' });
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
                    {newTopic.imagem && (
                      <img src={newTopic.imagem} alt="Preview" className="max-h-48 rounded-lg" loading="lazy" decoding="async" />
                    )}
                  </div>
                )}

                {/* Video Embed Input */}
                {showVideoInput && (
                  <div className="space-y-2">
                    <label className="label">Código Embed do Vídeo (YouTube, Vimeo, etc)</label>
                    <div className="flex gap-2">
                      <textarea
                        value={newTopic.embedVideo}
                        onChange={(e) => setNewTopic({ ...newTopic, embedVideo: e.target.value })}
                        className="input flex-1 min-h-[80px]"
                        placeholder='<iframe src="https://www.youtube.com/embed/..." ...></iframe>'
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewTopic({ ...newTopic, embedVideo: '' });
                          setShowVideoInput(false);
                        }}
                        className="btn btn-outline text-red-500 self-start"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {newTopic.embedVideo && (
                      <div
                        className="aspect-video max-w-md rounded-lg overflow-hidden bg-black"
                        dangerouslySetInnerHTML={{ __html: newTopic.embedVideo }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isCreating}
                className="btn btn-primary"
              >
                {isCreating ? 'Criando...' : 'Criar Tópico'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewTopic(false);
                  setShowImageInput(false);
                  setShowVideoInput(false);
                }}
                className="btn btn-outline"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Buscar tópicos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Topics List */}
      <div className="card divide-y divide-[var(--glass-border)]">
        {filteredTopics.length > 0 ? (
          filteredTopics.map((topic) => {
            const autor = topic.autor as UserType;
            return (
              <Link
                key={topic._id}
                to={`/forum/${topic._id}`}
                className="p-4 block hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    {autor?.fotoPerfil ? (
                      <img src={autor.fotoPerfil} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <User className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {topic.fixado && (
                        <Pin className="w-4 h-4 text-primary-500" />
                      )}
                      {topic.fechado && (
                        <Lock className="w-4 h-4 text-[var(--color-text-muted)]" />
                      )}
                      <h3 className="font-medium text-[var(--color-text-primary)] truncate">
                        {topic.titulo}
                      </h3>
                      {topic.imagem && <Image className="w-4 h-4 text-primary-500" />}
                      {topic.embedVideo && <Video className="w-4 h-4 text-primary-500" />}
                    </div>
                    <p className="text-[var(--color-text-muted)] text-sm line-clamp-2 mb-2">
                      {topic.conteudo}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                      <span>{autor?.nomeCompleto || 'Anônimo'}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(topic.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {topic.totalRespostas || topic.respostas?.length || 0} respostas
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{searchTerm ? 'Nenhum tópico encontrado' : 'Nenhum tópico criado ainda'}</p>
            {canPost && !searchTerm && (
              <button
                onClick={() => setShowNewTopic(true)}
                className="btn btn-primary mt-4"
              >
                Criar Primeiro Tópico
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Forum;

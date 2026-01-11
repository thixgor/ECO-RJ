import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, BookOpen, FileText, Play, ExternalLink, Download, Layers, X, ChevronRight, ChevronLeft, Award, Target, RotateCcw, AlertTriangle, Check, XCircle, Video, File, PlayCircle, Maximize, Minimize } from 'lucide-react';
import { lessonService, exerciseService, zoomService, siteConfigService } from '../services/api';
import { Lesson as LessonType, Exercise, Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { generateExercisePDF } from '../utils/pdfGenerator';
import { LoadingPage } from '../components/common/Loading';
import { formatDuration } from '../utils/formatDuration';
import VideoWatermark from '../components/common/VideoWatermark';
import toast from 'react-hot-toast';

// Interface for exercise result
interface ExerciseResult {
  nota: number;
  tentativa: number;
  tentativasRestantes: number;
  questoes: Array<{
    pergunta: string;
    suaResposta: any;
    respostaCorreta: any;
    correto: boolean;
    imagem?: string;
    respostaComentada?: string;
    fonteBibliografica?: string;
  }>;
}

const Lesson: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonType | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [relatedLessons, setRelatedLessons] = useState<LessonType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);

  // Exercise modal states
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Zoom meeting states
  const [isZoomJoined, setIsZoomJoined] = useState(false);
  const [isZoomConnecting, setIsZoomConnecting] = useState(false);
  const [zoomError, setZoomError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenSuggestion, setShowFullscreenSuggestion] = useState(false);
  const [joinedExternally, setJoinedExternally] = useState(false);
  const [zoomNativeEnabled, setZoomNativeEnabled] = useState(true);
  const zoomClientRef = useRef<any>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);

  const isWatched = user?.aulasAssistidas?.includes(id || '');

  useEffect(() => {
    if (id) loadLesson();
    loadSiteConfig();
  }, [id]);

  const loadSiteConfig = async () => {
    try {
      const response = await siteConfigService.get();
      const zoomNative = response.data?.zoomNative;
      setZoomNativeEnabled(zoomNative?.enabled ?? true);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      // Default to enabled if error
      setZoomNativeEnabled(true);
    }
  };

  const loadLesson = async () => {
    try {
      const [lessonResponse, exercisesResponse] = await Promise.all([
        lessonService.getById(id!),
        exerciseService.getByLesson(id!)
      ]);

      setLesson(lessonResponse.data);
      setExercises(exercisesResponse.data);

      // Carregar aulas relacionadas do mesmo curso
      const cursoId = typeof lessonResponse.data.cursoId === 'string'
        ? lessonResponse.data.cursoId
        : (lessonResponse.data.cursoId as any)?._id;

      if (cursoId) {
        loadRelatedLessons(cursoId, lessonResponse.data);
      }

      // Update metadata
      const title = `${lessonResponse.data.titulo} | ECO RJ`;
      const description = lessonResponse.data.descricao || '';
      document.title = title;

      const updateMeta = (property: string, content: string) => {
        const meta = document.querySelector(`meta[property="${property}"]`);
        if (meta) meta.setAttribute('content', content);
      };

      updateMeta('og:title', title);
      updateMeta('og:description', description);
      updateMeta('twitter:title', title);
      updateMeta('twitter:description', description);
    } catch (error: any) {
      console.error('Erro ao carregar aula:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para acessar esta aula');
        navigate('/perfil');
      } else {
        toast.error('Erro ao carregar aula');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar aulas relacionadas (mesmo subtópico, ou próximos tópicos)
  const loadRelatedLessons = async (cursoId: string, currentLesson: LessonType) => {
    try {
      const response = await lessonService.getByCourse(cursoId);
      const allLessons: LessonType[] = response.data || [];

      // Excluir a aula atual
      const otherLessons = allLessons.filter(l => l._id !== currentLesson._id && l.status === 'ativa');

      // Extrair IDs do tópico e subtópico da aula atual
      const currentSubtopicoId = typeof currentLesson.subtopicoId === 'string'
        ? currentLesson.subtopicoId
        : (currentLesson.subtopicoId as any)?._id;
      const currentTopicoId = typeof currentLesson.topicoId === 'string'
        ? currentLesson.topicoId
        : (currentLesson.topicoId as any)?._id;

      // Priorizar aulas:
      // 1. Do mesmo subtópico (se houver)
      // 2. Do mesmo tópico
      // 3. De tópicos seguintes (ordem maior)
      const related: LessonType[] = [];

      // 1. Aulas do mesmo subtópico
      if (currentSubtopicoId) {
        const sameSubtopic = otherLessons.filter(l => {
          const subId = typeof l.subtopicoId === 'string' ? l.subtopicoId : (l.subtopicoId as any)?._id;
          return subId === currentSubtopicoId;
        });
        related.push(...sameSubtopic);
      }

      // 2. Aulas do mesmo tópico (que não estejam já adicionadas)
      if (currentTopicoId) {
        const sameTopic = otherLessons.filter(l => {
          const topId = typeof l.topicoId === 'string' ? l.topicoId : (l.topicoId as any)?._id;
          const subId = typeof l.subtopicoId === 'string' ? l.subtopicoId : (l.subtopicoId as any)?._id;
          return topId === currentTopicoId && subId !== currentSubtopicoId;
        });
        related.push(...sameTopic);
      }

      // 3. Outras aulas do curso (próximas por ordem)
      const currentOrder = currentLesson.ordem || 0;
      const nextLessons = otherLessons
        .filter(l => !related.some(r => r._id === l._id))
        .filter(l => (l.ordem || 0) > currentOrder)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      related.push(...nextLessons);

      // 4. Se ainda não tiver o suficiente, adicionar aulas anteriores
      if (related.length < 6) {
        const prevLessons = otherLessons
          .filter(l => !related.some(r => r._id === l._id))
          .filter(l => (l.ordem || 0) < currentOrder)
          .sort((a, b) => (b.ordem || 0) - (a.ordem || 0));
        related.push(...prevLessons);
      }

      // Limitar a 6 aulas relacionadas
      setRelatedLessons(related.slice(0, 6));
    } catch (error) {
      console.error('Erro ao carregar aulas relacionadas:', error);
    }
  };

  const handleMarkAsWatched = async () => {
    if (isWatched) return;

    setIsMarking(true);
    try {
      await lessonService.markAsWatched(id!);
      await refreshUser();
      toast.success('Aula marcada como assistida!');
    } catch (error) {
      toast.error('Erro ao marcar aula');
    } finally {
      setIsMarking(false);
    }
  };

  // ========== Zoom Integration Functions ==========
  const joinZoomMeeting = useCallback(async () => {
    if (!lesson?.zoomMeetingId || !user) {
      toast.error('Dados de reunião não disponíveis');
      return;
    }

    // Validar e limpar o Meeting ID antes de processar
    const meetingId = lesson.zoomMeetingId?.trim();
    if (!meetingId) {
      toast.error('Meeting ID não está configurado corretamente');
      return;
    }

    setIsZoomConnecting(true);
    setZoomError(null);

    try {
      // Limpar Meeting ID (remover espaços e hífens)
      const cleanMeetingId = meetingId.replace(/\s|-/g, '');
      console.log('Generating Zoom signature for meeting:', cleanMeetingId);

      // Buscar signature JWT do backend
      const signatureResponse = await zoomService.generateSignature(cleanMeetingId, 0);
      const { signature } = signatureResponse.data;

      if (!signature) {
        throw new Error('Signature Zoom não disponível');
      }

      console.log('Signature received:', signature.substring(0, 50) + '...');
      console.log('Signature length:', signature.length);

      // Decodificar JWT para debug (apenas para verificar o payload)
      try {
        const parts = signature.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('Decoded JWT Payload:', payload);
        }
      } catch (e) {
        console.warn('Não foi possível decodificar JWT:', e);
      }

      // Verificar se o container existe
      if (!zoomContainerRef.current) {
        throw new Error('Container do Zoom não encontrado');
      }

      // Dynamic import do Zoom SDK (lazy loading)
      console.log('Loading Zoom SDK...');
      const ZoomMtgEmbeddedModule = await import('@zoom/meetingsdk/embedded');
      const ZoomMtgEmbedded = ZoomMtgEmbeddedModule.default || ZoomMtgEmbeddedModule;
      console.log('Zoom SDK loaded successfully');

      // Criar novo cliente Zoom (sempre criar novo para cada join)
      console.log('Creating Zoom client...');
      const client = ZoomMtgEmbedded.createClient();
      zoomClientRef.current = client;

      // Aguardar um pouco para garantir que o container está completamente renderizado
      await new Promise(resolve => setTimeout(resolve, 150));

      // Inicializar o container da reunião
      console.log('Initializing Zoom client...');

      // Calcular dimensões do container - usar o wrapper ou o container pai para obter dimensões reais
      const wrapperElement = zoomWrapperRef.current;
      let containerWidth = zoomContainerRef.current.offsetWidth;
      let containerHeight = zoomContainerRef.current.offsetHeight;

      // Se o container tem dimensões zeradas (porque está oculto), calcular baseado no pai
      if (containerWidth === 0 || containerHeight === 0) {
        // Buscar o card pai para obter a largura real
        const cardElement = zoomContainerRef.current.closest('.card');
        if (cardElement) {
          containerWidth = cardElement.clientWidth;
          containerHeight = Math.round(containerWidth * 9 / 16); // 16:9 aspect ratio
        } else if (wrapperElement) {
          // Fallback para o wrapper
          const rect = wrapperElement.getBoundingClientRect();
          containerWidth = rect.width || window.innerWidth * 0.65;
          containerHeight = rect.height || Math.round(containerWidth * 9 / 16);
        }
      }

      // Garantir dimensões mínimas
      containerWidth = Math.max(containerWidth, 640);
      containerHeight = Math.max(containerHeight, 360);

      console.log('Container dimensions:', { width: containerWidth, height: containerHeight });

      await client.init({
        zoomAppRoot: zoomContainerRef.current,
        language: 'pt-PT', // Zoom SDK aceita pt-PT (Português), não pt-BR
        patchJsMedia: true,
        leaveOnPageUnload: true,
        customize: {
          video: {
            isResizable: true,
            viewSizes: {
              default: {
                width: containerWidth,
                height: containerHeight
              }
            }
          },
          chat: {
            popper: {
              disableDraggable: false,
              anchorElement: zoomContainerRef.current,
              placement: 'right'
            }
          },
          meetingInfo: ['topic', 'host', 'mn', 'pwd', 'telPwd', 'invite', 'participant', 'dc', 'enctype']
          // Removido toolbar.buttons para manter controles padrão do Zoom
        }
      });
      console.log('Zoom client initialized successfully');

      // Aguardar mais um pouco após a inicialização antes de entrar na reunião
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('Joining meeting with params:', {
        meetingNumber: cleanMeetingId,
        password: lesson.zoomMeetingPassword ? '***' : '',
        userName: user.nomeCompleto,
        userEmail: user.email,
        signatureLength: signature.length
      });

      // Entrar na reunião com SDK JWT Signature
      // SDK JWT Signature já inclui appKey no payload, NÃO passar sdkKey aqui
      // Ref: https://devforum.zoom.us - SDK JWT usa tempo em SEGUNDOS (não milissegundos)
      await client.join({
        signature: signature,
        meetingNumber: cleanMeetingId,
        password: lesson.zoomMeetingPassword || '',
        userName: user.nomeCompleto,
        userEmail: user.email
      });

      console.log('Zoom meeting joined successfully');
      setIsZoomJoined(true);
      setIsZoomConnecting(false);
      toast.success('Conectado à aula ao vivo!');

      // Mostrar sugestão de tela cheia após 2 segundos
      setTimeout(() => {
        setShowFullscreenSuggestion(true);
      }, 2000);
    } catch (error: any) {
      console.error('Zoom initialization error:', error);
      setZoomError(error.message || 'Erro ao inicializar Zoom');
      setIsZoomConnecting(false);
      toast.error('Não foi possível carregar o Zoom integrado');
    }
  }, [lesson, user]);

  // Funções para abrir Zoom externamente
  const openZoomApp = useCallback(() => {
    if (!lesson?.zoomMeetingId) return;

    const cleanMeetingId = lesson.zoomMeetingId.replace(/\s|-/g, '');
    const password = lesson.zoomMeetingPassword || '';

    // URL do protocolo zoommtg:// para abrir o app Zoom
    const zoomAppUrl = `zoommtg://zoom.us/join?confno=${cleanMeetingId}${password ? `&pwd=${password}` : ''}`;
    window.location.href = zoomAppUrl;

    // Marcar que entrou externamente
    setJoinedExternally(true);
    toast.success('Abrindo Zoom App...');
  }, [lesson]);

  const openZoomBrowser = useCallback(() => {
    if (!lesson?.zoomMeetingId) return;

    const cleanMeetingId = lesson.zoomMeetingId.replace(/\s|-/g, '');
    const password = lesson.zoomMeetingPassword ? `?pwd=${lesson.zoomMeetingPassword}` : '';

    // URL para abrir Zoom no navegador
    const zoomBrowserUrl = `https://zoom.us/wc/join/${cleanMeetingId}${password}`;
    window.open(zoomBrowserUrl, '_blank');

    // Marcar que entrou externamente
    setJoinedExternally(true);
    toast.success('Abrindo Zoom no navegador...');
  }, [lesson]);

  const leaveZoomMeeting = useCallback(async () => {
    if (zoomClientRef.current && isZoomJoined) {
      try {
        // Sair do fullscreen se estiver ativo
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }

        // Tentar sair da reunião
        await zoomClientRef.current.leaveMeeting();
        setIsZoomJoined(false);
        setZoomError(null);
        setIsFullscreen(false);
        toast.success('Você saiu da aula ao vivo');
      } catch (error: any) {
        console.error('Error leaving Zoom:', error);

        // Se o erro for estado inválido (5004), considerar como saída bem-sucedida
        if (error?.errorCode === 5004) {
          setIsZoomJoined(false);
          setZoomError(null);
          setIsFullscreen(false);
          toast.success('Você saiu da aula ao vivo');
        } else {
          toast.error('Erro ao sair da reunião');
        }
      }
    }
  }, [isZoomJoined]);

  // Função para entrar em tela cheia e ocultar sugestão
  const enterFullscreenFromSuggestion = useCallback(async () => {
    setShowFullscreenSuggestion(false);
    if (zoomWrapperRef.current && !document.fullscreenElement) {
      try {
        await zoomWrapperRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen failed:', err);
        toast.error('Não foi possível entrar em tela cheia');
      }
    }
  }, []);

  // Funções de Fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!zoomWrapperRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await zoomWrapperRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast.error('Erro ao alternar tela cheia');
    }
  }, []);

  // Detectar mudanças de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Cleanup Zoom ao desmontar componente
  useEffect(() => {
    return () => {
      if (zoomClientRef.current && isZoomJoined) {
        // Usar timeout para garantir que o cleanup não interfira com o estado do Zoom
        setTimeout(() => {
          try {
            // Verificar se o cliente ainda existe e está em sessão válida
            if (zoomClientRef.current) {
              zoomClientRef.current.leaveMeeting().catch((err: any) => {
                // Ignorar erros de estado inválido durante cleanup
                if (err?.errorCode !== 5004) {
                  console.error('Cleanup error:', err);
                }
              });
            }
          } catch (err) {
            // Silenciar erros de cleanup
            console.log('Zoom cleanup completed');
          }
        }, 100);
      }
    };
  }, [isZoomJoined]);

  // Detectar mudanças de visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isZoomJoined) {
        console.log('User left page with active Zoom session');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isZoomJoined]);

  // Detectar refresh ou fechamento de página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isZoomJoined) {
        e.preventDefault();
        e.returnValue = 'Você está em uma aula ao vivo. Deseja sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isZoomJoined]);

  // ========== Exercise Modal Functions ==========
  const startExercise = useCallback(async (exercise: Exercise) => {
    try {
      const response = await exerciseService.getById(exercise._id);
      const fullExercise = response.data;
      setActiveExercise(fullExercise);
      setCurrentQuestionIndex(0);
      setAnswers(new Array(fullExercise.questoes.length).fill(null));
      setResult(null);
      setShowConfirmSubmit(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao carregar exercício');
    }
  }, []);

  const closeExercise = useCallback(() => {
    if (result) {
      setActiveExercise(null);
      setResult(null);
      refreshUser?.();
    } else if (answers.some(a => a !== null)) {
      if (confirm('Tem certeza que deseja sair? Suas respostas serão perdidas.')) {
        setActiveExercise(null);
        setResult(null);
      }
    } else {
      setActiveExercise(null);
      setResult(null);
    }
  }, [result, answers, refreshUser]);

  const selectAnswer = useCallback((questionIndex: number, answer: number | string) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answer;
      return newAnswers;
    });
  }, []);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < (activeExercise?.questoes.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  }, [activeExercise]);

  const submitExercise = useCallback(async () => {
    if (!activeExercise) return;

    const unansweredCount = answers.filter(a => a === null).length;
    if (unansweredCount > 0 && !showConfirmSubmit) {
      setShowConfirmSubmit(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await exerciseService.answer(activeExercise._id, answers);
      setResult(response.data);
      toast.success('Exercício enviado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar respostas');
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  }, [activeExercise, answers, showConfirmSubmit]);

  // Calculate progress for exercise modal
  const answeredCount = answers.filter(a => a !== null).length;
  const totalQuestions = activeExercise?.questoes.length || 0;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (isLoading) {
    return <LoadingPage text="Carregando aula..." />;
  }

  if (!lesson) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Aula não encontrada</h2>
        <Link to="/cursos" className="btn btn-primary">
          Ver cursos
        </Link>
      </div>
    );
  }

  const curso = lesson.cursoId as Course;

  // Extract video ID from embed or URL
  const getVideoEmbed = () => {
    let embedCode = lesson.embedVideo || '';

    if (!embedCode) return '';

    // 1. Priority: Check if it's already an iframe
    if (embedCode.trim().startsWith('<iframe')) {
      // Add responsive styles if they don't exist
      if (!embedCode.includes('position:absolute')) {
        return embedCode.replace(/<iframe/gi, '<iframe style="position:absolute;top:0;left:0;width:100%;height:100%;"');
      }
      return embedCode;
    }

    // 2. YouTube Regex (Handles standard, short, and embed URLs)
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = embedCode.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      return `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    // 3. Vimeo Regex
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
    const vimeoMatch = embedCode.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
      return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    // 4. Panda Video (example pattern, adjust if needed) or other generic URL handling
    if (embedCode.includes('pandavideo.com')) {
      // Assuming it's a direct link or something that needs an iframe, but better safe to return as is if unsure, 
      // OR wrap it in an iframe if it looks like a URL
      if (embedCode.startsWith('http')) {
        return `<iframe src="${embedCode}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
      }
    }

    // 5. Fallback: If it's just a URL but didn't match specific providers, try unwrapped
    if (embedCode.startsWith('http') && !embedCode.includes('<')) {
      return `<iframe src="${embedCode}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    // 6. Return original if nothing else matched (generic HTML or embed code)
    return embedCode;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Back button */}
      {curso && (
        <Link
          to={`/cursos/${typeof curso === 'string' ? curso : curso._id}`}
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-primary-500 mb-6 group transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para o curso
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player ou Zoom Container */}
          {lesson?.zoomMeetingId && lesson.tipo === 'ao_vivo' ? (
            <div className="card overflow-hidden">
              {/* Tela de entrada (antes de conectar) ou tela de "já entrou externamente" */}
              {!isZoomJoined && !joinedExternally && (
                <div className="relative w-full bg-gradient-to-br from-[#0a1628] to-[#1a2744]"
                     style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl">
                      <Video className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">
                      Aula ao Vivo via Zoom
                    </h3>

                    <p className="text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3">
                      Escolha como deseja participar da aula.
                    </p>

                    <div className="inline-block mb-3 sm:mb-4 px-3 py-1.5 bg-white/10 rounded-lg text-xs sm:text-sm text-gray-300">
                      Você entrará como: <strong className="text-cyan-400">{user?.nomeCompleto}</strong>
                    </div>

                    {zoomError && (
                      <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-xs max-w-sm mx-auto">
                        <strong className="block mb-0.5">Erro ao conectar:</strong>
                        {zoomError}
                      </div>
                    )}

                    <div className="space-y-2 w-full max-w-xs sm:max-w-sm">
                      {/* Opção 1: Ver nativamente aqui (só aparece se habilitado) */}
                      {zoomNativeEnabled && (
                        <button
                          onClick={joinZoomMeeting}
                          disabled={isZoomConnecting}
                          className="relative w-full flex flex-col items-center justify-center gap-0.5 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 border border-cyan-400/50"
                        >
                          {isZoomConnecting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-xs">Conectando...</span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                <span className="text-sm">Assistir Aqui Nativamente</span>
                              </div>
                              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
                                (em testes)
                              </span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Opção 2: Abrir no App Zoom */}
                      <button
                        onClick={openZoomApp}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg text-sm"
                      >
                        <Video className="w-4 h-4" />
                        Abrir no App Zoom
                      </button>

                      {/* Opção 3: Abrir no Navegador */}
                      <button
                        onClick={openZoomBrowser}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir no Navegador
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagem quando entrou externamente */}
              {!isZoomJoined && joinedExternally && (
                <div className="relative w-full bg-gradient-to-br from-[#0a2818] to-[#1a4428]"
                     style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl">
                      <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      Você já entrou na reunião
                    </h3>

                    <p className="text-gray-300 text-sm sm:text-base mb-4 sm:mb-6 max-w-md mx-auto">
                      A aula foi aberta em outra aba ou aplicativo.<br />
                      Aproveite sua aula ao vivo!
                    </p>

                    <button
                      onClick={() => setJoinedExternally(false)}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                    >
                      Voltar às Opções
                    </button>
                  </div>
                </div>
              )}

              {/* Container do Zoom SDK - sempre visível para ter dimensões, mas ocultado visualmente quando não conectado */}
              <div
                ref={zoomWrapperRef}
                className={`relative bg-black w-full overflow-hidden ${!isZoomJoined ? 'absolute inset-0 opacity-0 pointer-events-none' : ''}`}
                style={{
                  paddingBottom: '56.25%' /* 16:9 aspect ratio */
                }}
              >
                {/* Container interno do Zoom SDK */}
                <div
                  ref={zoomContainerRef}
                  id="zoom-meeting-container"
                  className="absolute inset-0 w-full h-full"
                  style={{ minWidth: '100%', minHeight: '100%' }}
                />

                {/* Controles sobrepostos */}
                {isZoomJoined && (
                  <div className={`absolute top-4 z-[9999] flex gap-3 ${isFullscreen ? 'left-4' : 'right-4'}`}>
                    <button
                      onClick={toggleFullscreen}
                      className="px-5 py-2.5 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-xl transition-all hover:shadow-2xl flex items-center gap-2 backdrop-blur-sm"
                      title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize className="w-4 h-4" />
                          Sair
                        </>
                      ) : (
                        <>
                          <Maximize className="w-4 h-4" />
                          Tela Cheia
                        </>
                      )}
                    </button>

                    <button
                      onClick={leaveZoomMeeting}
                      className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-xl transition-all hover:shadow-red-500/50 flex items-center gap-2 transform hover:scale-105"
                    >
                      <X className="w-4 h-4" />
                      Sair da Aula
                    </button>
                  </div>
                )}

                {/* Sugestão de tela cheia */}
                {isZoomJoined && showFullscreenSuggestion && !isFullscreen && (
                  <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in max-w-md">
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <Maximize className="w-6 h-6 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-bold text-base">Melhor experiência em tela cheia</p>
                          <p className="text-xs text-primary-100 mt-0.5">Recomendado para acompanhar a aula</p>
                        </div>
                        <button
                          onClick={() => setShowFullscreenSuggestion(false)}
                          className="p-1 hover:bg-white/20 rounded transition-colors"
                          aria-label="Fechar sugestão"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={enterFullscreenFromSuggestion}
                          className="flex-1 px-4 py-2 bg-white text-primary-600 hover:bg-primary-50 rounded-lg font-semibold transition-colors text-sm"
                        >
                          Tela Cheia
                        </button>
                        <button
                          onClick={() => setShowFullscreenSuggestion(false)}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors text-sm"
                        >
                          Agora Não
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : getVideoEmbed() ? (
            <div className="card overflow-hidden">
              <div
                id="video-container"
                className="relative w-full"
                style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}
              >
                <div
                  className="absolute inset-0 bg-gray-900"
                  dangerouslySetInnerHTML={{ __html: getVideoEmbed() }}
                />
                <VideoWatermark />
              </div>
            </div>
          ) : null}

          {/* Lesson Info */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {(lesson as any).topicoId && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 uppercase tracking-wider">
                      <BookOpen className="w-3 h-3" />
                      {(lesson as any).topicoId.titulo || (lesson as any).topicoId}
                    </div>
                  )}
                  {(lesson as any).subtopicoId && (
                    <>
                      <span className="text-gray-400 text-xs">/</span>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider">
                        <Layers className="w-3 h-3" />
                        {(lesson as any).subtopicoId.titulo || (lesson as any).subtopicoId}
                      </div>
                    </>
                  )}
                </div>
                <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                  {lesson.titulo}
                </h1>
                <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                  <span className={`px-2 py-0.5 rounded text-xs ${lesson.tipo === 'ao_vivo'
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    }`}>
                    {lesson.tipo === 'ao_vivo' ? 'Ao Vivo' : 'Gravada'}
                  </span>
                  {(lesson.duracao ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(lesson.duracao)}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleMarkAsWatched}
                disabled={isWatched || isMarking}
                className={`btn ${isWatched
                  ? 'bg-green-100 text-green-600 cursor-default'
                  : 'btn-primary'
                  }`}
              >
                {isWatched ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Assistida
                  </>
                ) : isMarking ? (
                  'Marcando...'
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Marcar como Assistida
                  </>
                )}
              </button>
            </div>

            {lesson.descricao && (
              <p className="text-[var(--color-text-secondary)]">{lesson.descricao}</p>
            )}

            {/* Custom Buttons */}
            {lesson.botoesPersonalizados && lesson.botoesPersonalizados.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-8">
                {lesson.botoesPersonalizados.map((btn, idx) => (
                  <a
                    key={idx}
                    href={btn.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-white/5 border-2 border-primary-500 rounded-xl text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-700 dark:hover:text-primary-300 transition-all shadow-sm hover:shadow-md text-base group"
                  >
                    <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {btn.nome}
                  </a>
                ))}
              </div>
            )}

            {lesson.notasAula && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-[var(--glass-border)]">
                <h3 className="font-medium mb-2 flex items-center gap-2 text-[var(--color-text-primary)]">
                  <FileText className="w-4 h-4 text-primary-500" />
                  {lesson.tipo === 'material' ? 'Notas do Material' : 'Notas da Aula'}
                </h3>
                <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">{lesson.notasAula}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Info */}
          {curso && (
            <div className="card p-6">
              <h3 className="font-heading font-semibold mb-4 flex items-center gap-2 text-[var(--color-text-primary)]">
                <BookOpen className="w-5 h-5 text-primary-500" />
                Curso
              </h3>
              <Link
                to={`/cursos/${typeof curso === 'string' ? curso : curso._id}`}
                className="text-primary-500 hover:underline font-medium"
              >
                {typeof curso === 'string' ? 'Ver curso' : curso.titulo}
              </Link>
            </div>
          )}

          {/* Exercises */}
          <div className="card">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h3 className="font-heading font-semibold flex items-center gap-2 text-[var(--color-text-primary)]">
                <Play className="w-5 h-5 text-primary-500" />
                Exercícios ({exercises.length})
              </h3>
            </div>
            <div className="divide-y divide-[var(--glass-border)]">
              {exercises.length > 0 ? (
                exercises.map((exercise) => (
                  <div key={exercise._id} className="flex items-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                    <button
                      onClick={() => startExercise(exercise)}
                      className="p-4 flex-1 text-left"
                    >
                      <p className="font-medium text-[var(--color-text-primary)] group-hover:text-primary-500 transition-colors">{exercise.titulo}</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        {exercise.tipo === 'multipla_escolha' && 'Múltipla Escolha'}
                        {exercise.tipo === 'verdadeiro_falso' && 'Verdadeiro ou Falso'}
                        {exercise.tipo === 'dissertativo' && 'Dissertativo'}
                        {' · '}
                        {exercise.questoes.length} questões
                      </p>
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        generateExercisePDF(exercise);
                      }}
                      className="mr-4 p-2 text-[var(--color-text-muted)] hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Baixar PDF"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-[var(--color-text-muted)]">
                  Nenhum exercício disponível
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Você Pode Assistir Também */}
      {relatedLessons.length > 0 && (
        <div className="mt-8">
          <div className="card">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h3 className="font-heading text-xl font-semibold flex items-center gap-2 text-[var(--color-text-primary)]">
                <PlayCircle className="w-6 h-6 text-primary-500" />
                Você pode assistir também
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Continue aprendendo com esses conteúdos relacionados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {relatedLessons.map((relatedLesson) => {
                const isRelatedWatched = user?.aulasAssistidas?.includes(relatedLesson._id);
                const topicoTitulo = typeof relatedLesson.topicoId === 'object'
                  ? (relatedLesson.topicoId as any)?.titulo
                  : null;
                const subtopicoTitulo = typeof relatedLesson.subtopicoId === 'object'
                  ? (relatedLesson.subtopicoId as any)?.titulo
                  : null;

                return (
                  <Link
                    key={relatedLesson._id}
                    to={`/aulas/${relatedLesson._id}`}
                    className="group block p-4 rounded-xl border border-[var(--glass-border)] hover:border-primary-300 dark:hover:border-primary-500/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        relatedLesson.tipo === 'ao_vivo'
                          ? 'bg-red-100 dark:bg-red-500/20'
                          : relatedLesson.tipo === 'material'
                          ? 'bg-amber-100 dark:bg-amber-500/20'
                          : 'bg-primary-100 dark:bg-primary-500/20'
                      }`}>
                        {relatedLesson.tipo === 'ao_vivo' ? (
                          <Video className={`w-6 h-6 ${relatedLesson.tipo === 'ao_vivo' ? 'text-red-500' : 'text-primary-500'}`} />
                        ) : relatedLesson.tipo === 'material' ? (
                          <File className="w-6 h-6 text-amber-500" />
                        ) : (
                          <Play className="w-6 h-6 text-primary-500" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[var(--color-text-primary)] group-hover:text-primary-500 transition-colors line-clamp-2">
                          {relatedLesson.titulo}
                        </h4>

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            relatedLesson.tipo === 'ao_vivo'
                              ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                              : relatedLesson.tipo === 'material'
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                          }`}>
                            {relatedLesson.tipo === 'ao_vivo' ? 'Ao Vivo' : relatedLesson.tipo === 'material' ? 'Material' : 'Gravada'}
                          </span>

                          {(relatedLesson.duracao ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                              <Clock className="w-3 h-3" />
                              {formatDuration(relatedLesson.duracao)}
                            </span>
                          )}

                          {isRelatedWatched && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" />
                              Assistida
                            </span>
                          )}
                        </div>

                        {/* Tópico/Subtópico */}
                        {(topicoTitulo || subtopicoTitulo) && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--color-text-muted)]">
                            {topicoTitulo && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {topicoTitulo}
                              </span>
                            )}
                            {topicoTitulo && subtopicoTitulo && (
                              <span>/</span>
                            )}
                            {subtopicoTitulo && (
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {subtopicoTitulo}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {activeExercise && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1c1e] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in shadow-2xl border border-transparent dark:border-white/10">

            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{activeExercise.titulo}</h2>
                  <p className="text-primary-100 text-sm mt-1">
                    {result ? 'Resultado do Exercício' : `Questão ${currentQuestionIndex + 1} de ${totalQuestions}`}
                  </p>
                </div>
                <button
                  onClick={closeExercise}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Progresso */}
              {!result && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-primary-100 mb-1">
                    <span>{answeredCount} de {totalQuestions} respondidas</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-2 bg-primary-400/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Corpo do Modal */}
            <div className="flex-1 overflow-y-auto">
              {result ? (
                // Tela de Resultado
                <div className="p-6 space-y-6">
                  {/* Score Card */}
                  <div className={`text-center p-8 rounded-2xl ${result.nota >= 70
                    ? 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-500/10 dark:to-emerald-500/20 border border-green-100 dark:border-green-500/20'
                    : result.nota >= 50
                      ? 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-500/10 dark:to-yellow-500/20 border border-amber-100 dark:border-amber-500/20'
                      : 'bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-500/10 dark:to-rose-500/20 border border-red-100 dark:border-red-500/20'
                    }`}>
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${result.nota >= 70
                      ? 'bg-green-500'
                      : result.nota >= 50
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                      }`}>
                      {result.nota >= 70 ? (
                        <Award className="w-12 h-12 text-white" />
                      ) : result.nota >= 50 ? (
                        <Target className="w-12 h-12 text-white" />
                      ) : (
                        <RotateCcw className="w-12 h-12 text-white" />
                      )}
                    </div>

                    <h3 className="text-4xl font-bold text-[var(--color-text-primary)]">{result.nota}%</h3>
                    <p className={`text-lg font-medium mt-2 ${result.nota >= 70
                      ? 'text-green-600 dark:text-green-400'
                      : result.nota >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                      }`}>
                      {result.nota >= 70
                        ? 'Excelente! Você mandou bem!'
                        : result.nota >= 50
                          ? 'Bom trabalho! Continue praticando.'
                          : 'Não desista! Tente novamente.'}
                    </p>

                    <div className="flex justify-center gap-6 mt-6 text-sm">
                      <div className="text-center">
                        <p className="text-[var(--color-text-muted)]">Tentativa</p>
                        <p className="text-xl font-bold text-[var(--color-text-primary)]">{result.tentativa}</p>
                      </div>
                      <div className="w-px bg-gray-300 dark:bg-white/20" />
                      <div className="text-center">
                        <p className="text-[var(--color-text-muted)]">Restantes</p>
                        <p className="text-xl font-bold text-[var(--color-text-primary)]">
                          {result.tentativasRestantes > 999900 ? '∞' : result.tentativasRestantes}
                        </p>
                      </div>
                      <div className="w-px bg-gray-300 dark:bg-white/20" />
                      <div className="text-center">
                        <p className="text-[var(--color-text-muted)]">Acertos</p>
                        <p className="text-xl font-bold text-[var(--color-text-primary)]">
                          {result.questoes.filter(q => q.correto).length}/{result.questoes.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes das Respostas */}
                  <div>
                    <h4 className="font-bold text-[var(--color-text-primary)] mb-4">Detalhamento das Respostas</h4>
                    <div className="space-y-3">
                      {result.questoes.map((q, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border-2 ${q.correto
                            ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10'
                            : 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${q.correto ? 'bg-green-500' : 'bg-red-500'
                              }`}>
                              {q.correto ? (
                                <Check className="w-5 h-5 text-white" />
                              ) : (
                                <XCircle className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-[var(--color-text-primary)] text-sm">
                                Questão {idx + 1}: {q.pergunta}
                              </p>
                              {!q.correto && (
                                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                                  Sua resposta: <span className="text-red-600 dark:text-red-400 font-medium">
                                    {activeExercise.questoes[idx]?.opcoes?.[q.suaResposta as number] || q.suaResposta || 'Não respondida'}
                                  </span>
                                </p>
                              )}
                              {(q.respostaComentada || q.fonteBibliografica) && (
                                <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
                                  {q.respostaComentada && (
                                    <div className="mb-2">
                                      <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        Comentário
                                      </p>
                                      <div className="text-sm text-[var(--color-text-secondary)] mt-1 pl-2.5 border-l-2 border-blue-500/30 italic">
                                        {q.respostaComentada}
                                      </div>
                                    </div>
                                  )}
                                  {q.fonteBibliografica && (
                                    <div className="mt-2">
                                      <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                        Fonte
                                      </p>
                                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 pl-2.5">
                                        {q.fonteBibliografica}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Tela de Questão
                <div className="p-6">
                  {/* Navegação por Questões */}
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {activeExercise.questoes.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => goToQuestion(idx)}
                        className={`w-10 h-10 rounded-lg font-medium text-sm transition-all flex-shrink-0 ${currentQuestionIndex === idx
                          ? 'bg-primary-500 text-white shadow-md'
                          : answers[idx] !== null
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-2 border-green-300 dark:border-green-500/30'
                            : 'bg-gray-100 dark:bg-white/5 text-[var(--color-text-muted)] hover:bg-gray-200 dark:hover:bg-white/10'
                          }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Questão Atual */}
                  {activeExercise.questoes[currentQuestionIndex] && (
                    <div>
                      <div className="mb-6">
                        <span className="text-xs font-semibold text-primary-500 uppercase tracking-wide">
                          Questão {currentQuestionIndex + 1}
                        </span>
                        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mt-2">
                          {activeExercise.questoes[currentQuestionIndex].pergunta}
                        </h3>

                        {/* Imagem da Questão */}
                        {activeExercise.questoes[currentQuestionIndex].imagem && (
                          <div className="mt-4 rounded-xl overflow-hidden shadow-sm border border-[var(--glass-border)]">
                            <img
                              src={activeExercise.questoes[currentQuestionIndex].imagem}
                              alt={`Imagem da questão ${currentQuestionIndex + 1}`}
                              className="w-full max-h-[300px] object-contain bg-gray-50 dark:bg-black/20"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        )}
                      </div>

                      {/* Opções */}
                      <div className="space-y-3">
                        {activeExercise.questoes[currentQuestionIndex].opcoes?.map((opcao, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => selectAnswer(currentQuestionIndex, optIdx)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${answers[currentQuestionIndex] === optIdx
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
                              : 'border-gray-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-500/50 hover:bg-gray-50 dark:hover:bg-white/5'
                              }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium text-sm ${answers[currentQuestionIndex] === optIdx
                                ? 'border-primary-500 bg-primary-500 text-white'
                                : 'border-gray-300 dark:border-white/20 text-[var(--color-text-muted)]'
                                }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <span className="flex-1">{opcao}</span>
                              {answers[currentQuestionIndex] === optIdx && (
                                <Check className="w-5 h-5 text-primary-500" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirmação de Envio */}
                  {showConfirmSubmit && (
                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-400">
                          Você tem {answers.filter(a => a === null).length} questão(ões) não respondida(s).
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
                          Deseja enviar mesmo assim?
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="border-t border-[var(--glass-border)] bg-gray-50 dark:bg-white/5 p-4 flex items-center justify-between">
              {result ? (
                <button
                  onClick={closeExercise}
                  className="btn btn-primary w-full"
                >
                  Fechar e Voltar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>

                  <div className="flex gap-2">
                    {currentQuestionIndex < totalQuestions - 1 ? (
                      <button
                        onClick={() => goToQuestion(currentQuestionIndex + 1)}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                      >
                        Próxima
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={submitExercise}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                      >
                        {isSubmitting ? 'Enviando...' : 'Finalizar'}
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lesson;

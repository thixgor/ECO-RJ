import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, BookOpen, FileText, Play, ExternalLink, Download, Layers, X, ChevronRight, Video, File, PlayCircle, Maximize, Minimize, MessageCircle, Settings, StickyNote } from 'lucide-react';
import { lessonService, exerciseService, zoomService, siteConfigService } from '../services/api';
import { Lesson as LessonType, Exercise, Course } from '../types';
import { construirEmbedSeguro } from '../utils/safeEmbed';
import { useAuth } from '../contexts/AuthContext';
import { generateExercisePDF } from '../utils/pdfGenerator';
import { LoadingPage } from '../components/common/Loading';
import { formatDuration } from '../utils/formatDuration';
import VideoWatermark from '../components/common/VideoWatermark';
import AutoAdvanceOverlay from '../components/lesson/AutoAdvanceOverlay';
import FloatingMiniPlayer from '../components/lesson/FloatingMiniPlayer';
import NotesSidePanel from '../components/lesson/NotesSidePanel';
import ExercisePlayer from '../components/exercises/ExercisePlayer';
import toast from 'react-hot-toast';

const Lesson: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Get resume timestamp from URL query parameter (if coming from "Continuar de onde parou")
  const resumeTimestamp = searchParams.get('t') ? parseInt(searchParams.get('t')!, 10) : null;
  const hasResumedRef = useRef(false); // Track if we already resumed to avoid multiple seeks

  const [lesson, setLesson] = useState<LessonType | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [relatedLessons, setRelatedLessons] = useState<LessonType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);

  // Exercise modal states
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  /** Trocar a key remonta o player — é assim que o botão "Refazer" reinicia. */
  const [exercisePlayerKey, setExercisePlayerKey] = useState(0);

  // Zoom meeting states
  const [isZoomJoined, setIsZoomJoined] = useState(false);
  const [isZoomConnecting, setIsZoomConnecting] = useState(false);
  const [isZoomInitializing, setIsZoomInitializing] = useState(false); // Para mostrar container durante init
  const [zoomError, setZoomError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenSuggestion, setShowFullscreenSuggestion] = useState(false);
  const [joinedExternally, setJoinedExternally] = useState(false);
  const [zoomNativeEnabled, setZoomNativeEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const zoomClientRef = useRef<any>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);

  // New feature states
  const [showAutoAdvance, setShowAutoAdvance] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [currentVideoTimestamp, setCurrentVideoTimestamp] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const isWatched = user?.aulasAssistidas?.includes(id || '');
  const isAdmin = user?.cargo === 'Administrador';

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

  // ========== New Feature Functions ==========

  // Get current video timestamp (for notes)
  const getCurrentTimestamp = useCallback((): number => {
    return currentVideoTimestamp;
  }, [currentVideoTimestamp]);

  // Seek video to specific timestamp
  const handleSeekToTimestamp = useCallback((timestamp: number) => {
    // Try to communicate with YouTube or Vimeo iframe via postMessage
    const iframe = videoContainerRef.current?.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      // YouTube API
      if (iframe.src.includes('youtube.com')) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [timestamp, true]
        }), '*');
      }
      // Vimeo API
      else if (iframe.src.includes('vimeo.com')) {
        iframe.contentWindow.postMessage(JSON.stringify({
          method: 'setCurrentTime',
          value: timestamp
        }), '*');
      }
    }
    // Close notes panel after seeking (optional UX improvement)
    setShowNotesPanel(false);
  }, []);

  // Handle auto-advance navigation
  const handleAutoAdvanceNavigate = useCallback(() => {
    if (relatedLessons.length > 0) {
      navigate(`/aulas/${relatedLessons[0]._id}`);
    }
    setShowAutoAdvance(false);
  }, [relatedLessons, navigate]);

  // Handle auto-advance cancel
  const handleAutoAdvanceCancel = useCallback(() => {
    setShowAutoAdvance(false);
  }, []);

  // Handle mini-player expand
  const handleMiniPlayerExpand = useCallback(() => {
    setShowMiniPlayer(false);
    // Scroll to video container
    videoContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Handle mini-player close
  const handleMiniPlayerClose = useCallback(() => {
    setShowMiniPlayer(false);
  }, []);

  // Listen for video events via postMessage
  useEffect(() => {
    const iframe = videoContainerRef.current?.querySelector('iframe');

    // Function to send command to Vimeo iframe
    const sendVimeoCommand = (method: string, value?: any) => {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          method,
          value
        }), '*');
      }
    };

    // Function to request video duration
    const requestVideoDuration = () => {
      const iframe = videoContainerRef.current?.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        if (iframe.src.includes('youtube.com')) {
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'getDuration',
            args: []
          }), '*');
        } else if (iframe.src.includes('vimeo.com')) {
          sendVimeoCommand('getDuration');
        }
      }
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;

        // Parse if it's a JSON string
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }

        // YouTube player state change
        if (data.event === 'onStateChange') {
          // Player state 0 = ended
          if (data.info === 0 && lesson?.tipo === 'gravada' && relatedLessons.length > 0) {
            setShowAutoAdvance(true);
            // Auto-mark as watched when video ends
            if (id && !isWatched) {
              handleMarkAsWatched();
            }
          }
          // Player state 1 = playing
          if (data.info === 1) {
            requestVideoDuration();
          }
        }

        // YouTube player metadata (contains duration)
        if (data.event === 'infoDelivery' && data.info?.duration !== undefined) {
          setVideoDuration(Math.floor(data.info.duration));
        }

        // YouTube current time update (from infoDelivery)
        if (data.event === 'infoDelivery' && data.info?.currentTime !== undefined) {
          setCurrentVideoTimestamp(Math.floor(data.info.currentTime));
        }

        // Vimeo events
        if (data.event === 'ended' && lesson?.tipo === 'gravada' && relatedLessons.length > 0) {
          setShowAutoAdvance(true);
          // Auto-mark as watched when video ends
          if (id && !isWatched) {
            handleMarkAsWatched();
          }
        }

        // Vimeo timeupdate
        if (data.event === 'timeupdate' && data.data?.seconds !== undefined) {
          setCurrentVideoTimestamp(Math.floor(data.data.seconds));
        }

        // Vimeo playProgress (alternative event)
        if (data.event === 'playProgress' && data.value?.seconds !== undefined) {
          setCurrentVideoTimestamp(Math.floor(data.value.seconds));
        }

        // Vimeo duration
        if (data.event === 'durationchange' && data.data?.duration !== undefined) {
          setVideoDuration(Math.floor(data.data.duration));
        }

        // Vimeo getCurrentTime response
        if (data.method === 'getCurrentTime' && data.value !== undefined) {
          setCurrentVideoTimestamp(Math.floor(data.value));
        }

        // Vimeo getDuration response
        if (data.method === 'getDuration' && data.value !== undefined) {
          setVideoDuration(Math.floor(data.value));
        }

        // Vimeo play event - get current time and duration
        if (data.event === 'play') {
          console.log('Vimeo play event received');
          sendVimeoCommand('getCurrentTime');
          sendVimeoCommand('getDuration');
        }

        // Vimeo pause event - get current time
        if (data.event === 'pause') {
          console.log('Vimeo pause event received');
          sendVimeoCommand('getCurrentTime');
        }
      } catch (err) {
        // Ignore parse errors from other sources
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lesson?.tipo, relatedLessons.length]);

  // Setup YouTube/Vimeo API communication
  useEffect(() => {
    if (!lesson?.embedVideo || lesson.tipo !== 'gravada') return;

    const iframe = videoContainerRef.current?.querySelector('iframe');
    if (!iframe) return;

    // Function to send command to YouTube iframe
    const sendYouTubeCommand = (func: string, args?: any[]) => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func,
          args: args || []
        }), '*');
      }
    };

    // Function to send command to Vimeo iframe
    const sendVimeoCommand = (method: string, value?: any) => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          method,
          value
        }), '*');
      }
    };

    // Start listening for YouTube events
    const startYouTubeListening = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'listening',
          id: 'youtube-player'
        }), '*');
      }
    };

    // Poll for current time periodically (fallback for YouTube)
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    if (iframe.src.includes('youtube.com')) {
      // Wait for iframe to load, then start listening
      const onIframeLoad = () => {
        setTimeout(() => {
          startYouTubeListening();
          // Also request current time periodically
          sendYouTubeCommand('getCurrentTime');
        }, 1000);
      };

      iframe.addEventListener('load', onIframeLoad);

      // If iframe already loaded
      if (iframe.contentWindow) {
        onIframeLoad();
      }

      // Poll for time updates every 500ms as fallback
      pollInterval = setInterval(() => {
        sendYouTubeCommand('getCurrentTime');
        sendYouTubeCommand('getDuration');
      }, 500);

      return () => {
        iframe.removeEventListener('load', onIframeLoad);
        if (pollInterval) clearInterval(pollInterval);
      };
    }

    if (iframe.src.includes('vimeo.com')) {
      // Vimeo: add event listeners
      const onIframeLoad = () => {
        setTimeout(() => {
          sendVimeoCommand('addEventListener', 'play');
          sendVimeoCommand('addEventListener', 'pause');
          sendVimeoCommand('addEventListener', 'playProgress');
          sendVimeoCommand('addEventListener', 'timeupdate');
          sendVimeoCommand('addEventListener', 'ended');
          sendVimeoCommand('addEventListener', 'durationchange');
          // Request initial time and duration
          sendVimeoCommand('getCurrentTime');
          sendVimeoCommand('getDuration');
        }, 1000);
      };

      iframe.addEventListener('load', onIframeLoad);

      if (iframe.contentWindow) {
        onIframeLoad();
      }

      // Poll Vimeo for current time periodically as fallback
      pollInterval = setInterval(() => {
        sendVimeoCommand('getCurrentTime');
      }, 500);

      return () => {
        iframe.removeEventListener('load', onIframeLoad);
        if (pollInterval) clearInterval(pollInterval);
      };
    }
  }, [lesson?.embedVideo, lesson?.tipo]);

  // Intersection Observer for mini-player (desktop only)
  useEffect(() => {
    // Only enable for recorded lessons with video on desktop
    if (!lesson || lesson.tipo !== 'gravada' || !lesson.embedVideo) return;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return; // Skip on mobile

    const videoElement = videoContainerRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show mini-player when video is not visible
        setShowMiniPlayer(!entry.isIntersecting);
      },
      {
        threshold: 0.3, // Trigger when less than 30% visible
        rootMargin: '-100px 0px 0px 0px'
      }
    );

    observer.observe(videoElement);
    return () => observer.disconnect();
  }, [lesson?.tipo, lesson?.embedVideo]);

  // Refs to store latest values for use in cleanup/beforeunload
  const currentTimestampRef = useRef(currentVideoTimestamp);
  const videoDurationRef = useRef(videoDuration);
  const lessonIdRef = useRef(id);
  const lessonTypeRef = useRef(lesson?.tipo);
  const hasEmbedVideoRef = useRef(!!lesson?.embedVideo);

  // Keep refs in sync with state
  useEffect(() => {
    currentTimestampRef.current = currentVideoTimestamp;
  }, [currentVideoTimestamp]);

  useEffect(() => {
    videoDurationRef.current = videoDuration;
  }, [videoDuration]);

  useEffect(() => {
    lessonIdRef.current = id;
    lessonTypeRef.current = lesson?.tipo;
    hasEmbedVideoRef.current = !!lesson?.embedVideo;
  }, [id, lesson?.tipo, lesson?.embedVideo]);

  // Save progress when leaving the page (only if timestamp > 0)
  useEffect(() => {
    if (!lesson || lesson.tipo !== 'gravada' || !lesson.embedVideo) return;

    const saveProgressOnExit = () => {
      const timestamp = currentTimestampRef.current;
      const duration = videoDurationRef.current;
      const lessonId = lessonIdRef.current;

      // Only save if we have a valid timestamp (user actually watched something)
      if (!lessonId || timestamp <= 0 || duration <= 0) return;

      const progresso = Math.round((timestamp / duration) * 100);

      // Use sendBeacon for reliable saving on page exit
      const data = JSON.stringify({ progresso, timestamp });
      const token = localStorage.getItem('token');

      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        // Note: sendBeacon doesn't support custom headers, so we use fetch with keepalive as fallback
        navigator.sendBeacon(`/api/lessons/${lessonId}/update-progress`, blob);
      }

      // Also try fetch with keepalive for authenticated request
      fetch(`/api/lessons/${lessonId}/update-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: data,
        keepalive: true
      }).catch(() => {
        // Ignore errors on page exit
      });
    };

    // Save when user leaves/refreshes the page
    const handleBeforeUnload = () => {
      saveProgressOnExit();
    };

    // Save when visibility changes (user switches tabs or minimizes)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgressOnExit();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: save progress when component unmounts (navigation away)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      saveProgressOnExit();
    };
  }, [lesson?.tipo, lesson?.embedVideo]);

  // Resume video from saved timestamp when coming from "Continuar de onde parou"
  useEffect(() => {
    if (!lesson || lesson.tipo !== 'gravada' || !lesson.embedVideo) return;
    if (!resumeTimestamp || resumeTimestamp <= 0) return;
    if (hasResumedRef.current) return; // Already resumed

    const iframe = videoContainerRef.current?.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) return;

    // Function to seek video to saved timestamp
    const seekToSavedTimestamp = () => {
      if (hasResumedRef.current) return;

      if (iframe.src.includes('youtube.com')) {
        iframe.contentWindow?.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [resumeTimestamp, true]
        }), '*');
        hasResumedRef.current = true;
      } else if (iframe.src.includes('vimeo.com')) {
        iframe.contentWindow?.postMessage(JSON.stringify({
          method: 'setCurrentTime',
          value: resumeTimestamp
        }), '*');
        hasResumedRef.current = true;
      }
    };

    // Try to seek after a short delay to ensure iframe is ready
    const timeoutId = setTimeout(() => {
      seekToSavedTimestamp();
    }, 2000);

    // Also try when we first get video duration (indicates player is ready)
    if (videoDuration > 0 && !hasResumedRef.current) {
      seekToSavedTimestamp();
    }

    return () => clearTimeout(timeoutId);
  }, [lesson?.tipo, lesson?.embedVideo, resumeTimestamp, videoDuration]);

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
    setIsZoomInitializing(true); // Mostrar container para obter dimensões
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
      setIsZoomInitializing(false); // Esconder container em caso de erro
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

  // Função para recalcular dimensões do Zoom
  const resizeZoomMeeting = useCallback(() => {
    if (!zoomClientRef.current || !isZoomJoined) return;

    try {
      let newWidth: number;
      let newHeight: number;

      if (document.fullscreenElement) {
        // Em tela cheia: usar viewport inteira
        newWidth = window.innerWidth;
        newHeight = window.innerHeight;
      } else if (zoomWrapperRef.current) {
        // Modo normal: usar dimensões do container
        const rect = zoomWrapperRef.current.getBoundingClientRect();
        newWidth = rect.width;
        newHeight = rect.height;

        // Fallback se dimensões inválidas
        if (newWidth === 0 || newHeight === 0) {
          const cardElement = zoomWrapperRef.current.closest('.card');
          if (cardElement) {
            newWidth = cardElement.clientWidth;
            newHeight = Math.round(newWidth * 9 / 16);
          }
        }
      } else {
        return;
      }

      // Garantir dimensões mínimas
      newWidth = Math.max(Math.round(newWidth), 320);
      newHeight = Math.max(Math.round(newHeight), 180);

      console.log('Resizing Zoom to:', { width: newWidth, height: newHeight, fullscreen: !!document.fullscreenElement });

      // Redimensionar o cliente Zoom
      zoomClientRef.current.updateVideoSize?.(newWidth, newHeight);
    } catch (error) {
      console.error('Error resizing Zoom:', error);
    }
  }, [isZoomJoined]);

  // Função para abrir/fechar chat do Zoom
  const toggleChat = useCallback(() => {
    if (!zoomClientRef.current || !isZoomJoined) return;

    try {
      const newChatState = !isChatOpen;
      setIsChatOpen(newChatState);

      // Tentar usar a API do Zoom SDK para controlar o chat
      if (newChatState) {
        // Abrir chat
        zoomClientRef.current.openChat?.();
      } else {
        // Fechar chat
        zoomClientRef.current.closeChat?.();
      }

      console.log('Chat toggled:', newChatState);
    } catch (error) {
      console.error('Error toggling chat:', error);
    }
  }, [isZoomJoined, isChatOpen]);

  // Detectar mudanças de fullscreen e redimensionar
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      // Aguardar transição de fullscreen antes de redimensionar
      setTimeout(() => {
        resizeZoomMeeting();
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [resizeZoomMeeting]);

  // Detectar mudanças de tamanho da janela e zoom do navegador
  useEffect(() => {
    if (!isZoomJoined) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Debounce para evitar muitas chamadas
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        resizeZoomMeeting();
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    // Também detectar mudanças de orientação em dispositivos móveis
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [isZoomJoined, resizeZoomMeeting]);

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

  // ========== Exercícios ==========
  // A experiência de responder vive em <ExercisePlayer /> — o mesmo componente
  // usado na página de Exercícios, para não haver duas UXs diferentes.
  const startExercise = useCallback(async (exercise: Exercise) => {
    try {
      const response = await exerciseService.getById(exercise._id);
      setActiveExercise(response.data);
      setExercisePlayerKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao carregar exercício');
    }
  }, []);

  // Extract video ID from embed or URL
  /**
   * HTML do player da aula.
   *
   * A versão anterior reemitia o `<iframe>` colado pelo administrador, apenas
   * "consertando" o `src` e injetando um `style` na marca `<iframe` — o que
   * duplicava o atributo quando o código colado já tinha `style` (o HTML honra o
   * primeiro, então o vídeo perdia o dimensionamento) e, no ramo final, devolvia
   * qualquer HTML salvo tal e qual, direto para `dangerouslySetInnerHTML`.
   *
   * Agora a marcação é sempre construída aqui, a partir só da URL extraída, e o
   * resultado é memoizado — antes `getVideoEmbed()` rodava três vezes por render.
   */
  const videoEmbedHtml = useMemo(
    () =>
      construirEmbedSeguro(typeof lesson?.embedVideo === 'string' ? lesson.embedVideo : '', {
        comApi: true,
        id: 'lesson-player',
        absoluto: true,
        titulo: lesson?.titulo || 'Aula'
      }),
    [lesson?.embedVideo, lesson?.titulo]
  );

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Navigation bar */}
      <div className="flex items-center justify-between mb-6">
        {/* Back button */}
        {curso ? (
          <Link
            to={`/cursos/${typeof curso === 'string' ? curso : curso._id}`}
            className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-primary-500 group transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar para o curso
          </Link>
        ) : (
          <div />
        )}

        {/* Admin Edit Button */}
        {isAdmin && lesson && (
          <Link
            to={`/admin/aulas?edit=${lesson._id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            Editar Aula
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player ou Zoom Container */}
          {lesson?.zoomMeetingId && lesson.tipo === 'ao_vivo' ? (
            <div className="card overflow-hidden">
              {/* Tela de entrada (antes de conectar) ou tela de "já entrou externamente" */}
              {!isZoomJoined && !joinedExternally && !isZoomInitializing && (
                <div className="w-full bg-gradient-to-br from-[#0a1628] to-[#1a2744] rounded-xl">
                  <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
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
                <div className="w-full bg-gradient-to-br from-[#0a2818] to-[#1a4428] rounded-xl">
                  <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
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

              {/* Container do Zoom SDK - visível durante inicialização e quando conectado */}
              <div
                ref={zoomWrapperRef}
                className={`zoom-meeting-wrapper relative bg-black w-full overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9998]' : ''} ${isChatOpen ? 'chat-open' : ''}`}
                style={{
                  // Em tela cheia: 100% da viewport; Modo normal: aspect ratio 16:9
                  ...(isFullscreen ? {
                    width: '100vw',
                    height: '100vh',
                    paddingBottom: '0'
                  } : {
                    paddingBottom: (isZoomInitializing || isZoomJoined) ? '56.25%' : '0'
                  }),
                  display: (isZoomInitializing || isZoomJoined) ? 'block' : 'none'
                }}
              >
                {/* Container interno do Zoom SDK */}
                <div
                  ref={zoomContainerRef}
                  id="zoom-meeting-container"
                  className="zoom-sdk-container absolute inset-0 w-full h-full"
                  style={isFullscreen ? { width: '100vw', height: '100vh' } : undefined}
                />

                {/* Controles sobrepostos */}
                {isZoomJoined && (
                  <div className={`absolute top-4 z-[9999] flex gap-2 ${isFullscreen ? 'left-4' : 'right-4'}`}>
                    {/* Botão de Chat */}
                    <button
                      onClick={toggleChat}
                      className={`px-4 py-2.5 rounded-lg font-semibold shadow-xl transition-all flex items-center gap-2 backdrop-blur-sm ${
                        isChatOpen
                          ? 'bg-primary-500 hover:bg-primary-600 text-white'
                          : 'bg-gray-800/90 hover:bg-gray-700 text-white'
                      }`}
                      title={isChatOpen ? 'Fechar Chat' : 'Abrir Chat'}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {!isFullscreen && <span className="hidden sm:inline">Chat</span>}
                    </button>

                    {/* Botão Tela Cheia */}
                    <button
                      onClick={toggleFullscreen}
                      className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-xl transition-all hover:shadow-2xl flex items-center gap-2 backdrop-blur-sm"
                      title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize className="w-4 h-4" />
                          <span className="hidden sm:inline">Sair</span>
                        </>
                      ) : (
                        <>
                          <Maximize className="w-4 h-4" />
                          <span className="hidden sm:inline">Tela Cheia</span>
                        </>
                      )}
                    </button>

                    {/* Botão Sair da Aula */}
                    <button
                      onClick={leaveZoomMeeting}
                      className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-xl transition-all hover:shadow-red-500/50 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Sair</span>
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
          ) : videoEmbedHtml ? (
            <div className="card overflow-hidden relative">
              <div
                ref={videoContainerRef}
                id="video-container"
                className="relative w-full"
                style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}
              >
                <div
                  className="absolute inset-0 bg-gray-900"
                  dangerouslySetInnerHTML={{ __html: videoEmbedHtml }}
                />
                <VideoWatermark />

                {/* Auto-Advance Overlay */}
                {showAutoAdvance && relatedLessons.length > 0 && (
                  <AutoAdvanceOverlay
                    nextLesson={relatedLessons[0]}
                    onNavigate={handleAutoAdvanceNavigate}
                    onCancel={handleAutoAdvanceCancel}
                    countdownSeconds={5}
                  />
                )}
              </div>

              {/* Notes Button - Floating on video */}
              {lesson.tipo === 'gravada' && (
                <button
                  onClick={() => setShowNotesPanel(true)}
                  className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-2 bg-black/60 hover:bg-black/80 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 backdrop-blur-sm"
                  title="Minhas Notas"
                >
                  <StickyNote className="w-4 h-4" />
                  <span className="hidden sm:inline">Notas</span>
                </button>
              )}
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

              {/* Botão de marcar como assistida - oculto para materiais */}
              {lesson.tipo !== 'material' && (
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
              )}
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

      {/* Player de exercícios (mesmo componente da página de Exercícios) */}
      {activeExercise && (
        <ExercisePlayer
          key={exercisePlayerKey}
          exercise={activeExercise}
          onClose={(enviado) => {
            setActiveExercise(null);
            if (enviado) refreshUser?.();
          }}
          onRestart={() => setExercisePlayerKey((k) => k + 1)}
        />
      )}

      {/* Floating Mini-Player (desktop only, recorded lessons) */}
      {lesson?.tipo === 'gravada' && lesson.embedVideo && (
        <FloatingMiniPlayer
          embedHtml={videoEmbedHtml}
          isVisible={showMiniPlayer}
          onExpand={handleMiniPlayerExpand}
          onClose={handleMiniPlayerClose}
        />
      )}

      {/* Notes Side Panel */}
      {lesson?.tipo === 'gravada' && (
        <NotesSidePanel
          lessonId={id || ''}
          isOpen={showNotesPanel}
          onClose={() => setShowNotesPanel(false)}
          getCurrentTimestamp={getCurrentTimestamp}
          onSeekToTimestamp={handleSeekToTimestamp}
        />
      )}
    </div>
  );
};

export default Lesson;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, BookOpen, FileText, Play, ExternalLink, Download, Layers, ChevronRight, Video, File, PlayCircle, Settings, StickyNote } from 'lucide-react';
import { lessonService, exerciseService, siteConfigService } from '../services/api';
import { Lesson as LessonType, Exercise, Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { generateExercisePDF } from '../utils/pdfGenerator';
import { LoadingPage } from '../components/common/Loading';
import { formatDuration } from '../utils/formatDuration';
import VideoWatermark from '../components/common/VideoWatermark';
import AutoAdvanceOverlay from '../components/lesson/AutoAdvanceOverlay';
import FloatingMiniPlayer from '../components/lesson/FloatingMiniPlayer';
import NotesSidePanel from '../components/lesson/NotesSidePanel';
import LiveClassRoom from '../components/lesson/LiveClassRoom';
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

  // Aula ao vivo (Zoom integrado — ver components/lesson/LiveClassRoom)
  const [zoomNativeEnabled, setZoomNativeEnabled] = useState(true);
  const [liveFocusMode, setLiveFocusMode] = useState(false);
  const exercisesRef = useRef<HTMLDivElement>(null);

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

  // ========== Aula ao vivo ==========
  // Presença registrada automaticamente pela sala após alguns minutos conectado.
  const handleLiveAttendance = useCallback(async () => {
    if (!id || user?.aulasAssistidas?.includes(id)) return;
    try {
      await lessonService.markAsWatched(id);
      await refreshUser();
      toast.success('Presença registrada nesta aula');
    } catch {
      // silencioso: o aluno ainda pode marcar manualmente
    }
  }, [id, user?.aulasAssistidas, refreshUser]);

  const scrollToExercises = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    exercisesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    exercisesRef.current?.focus({ preventScroll: true });
  }, []);

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
    let embedCode = typeof lesson.embedVideo === 'string' ? lesson.embedVideo : '';

    if (!embedCode) return '';

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // Helper to add YouTube API params
    const addYouTubeParams = (url: string) => {
      const params = new URLSearchParams();
      params.set('enablejsapi', '1');
      params.set('origin', origin);
      params.set('widget_referrer', origin);

      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${params.toString()}`;
    };

    // Helper to add Vimeo API params
    const addVimeoParams = (url: string) => {
      const params = new URLSearchParams();
      params.set('api', '1');
      params.set('player_id', 'vimeo-player');

      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${params.toString()}`;
    };

    // 1. Priority: Check if it's already an iframe
    if (typeof embedCode === 'string' && embedCode.trim().startsWith('<iframe')) {
      // Extract src and modify it
      const srcMatch = embedCode.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        let src = srcMatch[1];

        // Add API params based on provider
        if (src.includes('youtube.com') && !src.includes('enablejsapi')) {
          src = addYouTubeParams(src);
        } else if (src.includes('vimeo.com') && !src.includes('api=1')) {
          src = addVimeoParams(src);
        }

        // Replace src in iframe
        embedCode = embedCode.replace(/src=["'][^"']+["']/, `src="${src}"`);
      }

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
      const ytUrl = addYouTubeParams(`https://www.youtube.com/embed/${ytMatch[1]}`);
      return `<iframe id="youtube-player" width="100%" height="100%" src="${ytUrl}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    // 3. Vimeo Regex
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
    const vimeoMatch = embedCode.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
      const vimeoUrl = addVimeoParams(`https://player.vimeo.com/video/${vimeoMatch[1]}`);
      return `<iframe id="vimeo-player" src="${vimeoUrl}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture" style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
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

  // Aula ao vivo mostra a sala; depois que o horário passa e a gravação é
  // publicada no campo de vídeo, a página passa a exibir a gravação.
  const videoEmbed = getVideoEmbed();
  const liveStart = lesson.dataHoraInicio ? new Date(lesson.dataHoraInicio).getTime() : NaN;
  const liveEnded =
    lesson.status === 'expirada' ||
    (!Number.isNaN(liveStart) && Date.now() > liveStart + ((lesson.duracao || 120) * 60000));
  const showLiveRoom =
    lesson.tipo === 'ao_vivo' && (lesson.zoomMeetingId ? !(liveEnded && videoEmbed) : !videoEmbed);

  const getNotesTimestamp = (): number => {
    if (showLiveRoom) {
      // Nas aulas ao vivo, a nota fica marcada no tempo desde o início da aula
      return Number.isNaN(liveStart) ? 0 : Math.max(0, Math.floor((Date.now() - liveStart) / 1000));
    }
    return currentVideoTimestamp;
  };

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
          {/* Aula ao vivo (Zoom dentro da plataforma) ou player de vídeo */}
          {showLiveRoom ? (
            <LiveClassRoom
              lesson={lesson}
              userName={user?.nomeCompleto || 'Aluno ECO RJ'}
              userEmail={user?.email || ''}
              integratedEnabled={zoomNativeEnabled}
              alreadyAttended={!!isWatched}
              onAttendance={handleLiveAttendance}
              onOpenNotes={() => setShowNotesPanel(true)}
              hasExercises={exercises.length > 0}
              onGoToExercises={scrollToExercises}
              onFocusModeChange={setLiveFocusMode}
            />
          ) : videoEmbed ? (
            <div className="card overflow-hidden relative">
              <div
                ref={videoContainerRef}
                id="video-container"
                className="relative w-full"
                style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}
              >
                <div
                  className="absolute inset-0 bg-gray-900"
                  dangerouslySetInnerHTML={{ __html: videoEmbed }}
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
              {lesson.tipo !== 'material' && (
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
          <div className="card scroll-mt-24 outline-none" ref={exercisesRef} tabIndex={-1}>
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
          embedHtml={getVideoEmbed()}
          isVisible={showMiniPlayer}
          onExpand={handleMiniPlayerExpand}
          onClose={handleMiniPlayerClose}
        />
      )}

      {/* Notes Side Panel (gravadas e ao vivo) */}
      {lesson?.tipo !== 'material' && (
        <NotesSidePanel
          lessonId={id || ''}
          isOpen={showNotesPanel}
          onClose={() => setShowNotesPanel(false)}
          getCurrentTimestamp={getNotesTimestamp}
          onSeekToTimestamp={handleSeekToTimestamp}
          elevated={liveFocusMode}
        />
      )}
    </div>
  );
};

export default Lesson;

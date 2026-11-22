import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  CheckCircle,
  Circle,
  Copy,
  Headphones,
  Loader2,
  LogOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  StickyNote,
  UserCheck,
  Users,
  Video,
  WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { zoomService } from '../../services/api';
import { Lesson } from '../../types';

/* ──────────────────────────────────────────────────────────────────────────
 * Sala de aula ao vivo (Zoom Meeting SDK — Component View)
 *
 * Tudo acontece dentro da página da aula: o aluno clica em "Entrar na aula"
 * e o Zoom é montado aqui. Estados:
 *
 *   pronta ─► conectando ─► na_aula ─► saiu | encerrada
 *                 │
 *                 ├─► aguardando  (professor ainda não abriu: nova tentativa
 *                 │                automática a cada 15 s)
 *                 └─► erro        (mensagem com causa + como resolver)
 *
 * Abrir no aplicativo Zoom continua possível, mas só como saída de emergência
 * (após um erro) ou quando o admin desliga a sala integrada.
 * ────────────────────────────────────────────────────────────────────────── */

type Fase = 'pronta' | 'conectando' | 'aguardando' | 'na_aula' | 'saiu' | 'encerrada' | 'erro';
type Etapa = 'acesso' | 'sala' | 'entrando';
type Janela = 'sem_data' | 'futura' | 'abrindo' | 'ao_vivo' | 'terminou';

interface ErroSala {
  titulo: string;
  detalhe: string;
  /** Problema de configuração: tentar de novo não resolve. */
  definitivo?: boolean;
}

interface LiveClassRoomProps {
  lesson: Lesson;
  userName: string;
  userEmail: string;
  /** Configuração do admin: sala integrada ligada (padrão) ou só app externo. */
  integratedEnabled: boolean;
  alreadyAttended: boolean;
  onAttendance: () => void;
  onOpenNotes: () => void;
  hasExercises: boolean;
  onGoToExercises: () => void;
  /** Modo foco cobre a página; o pai usa isso para elevar o painel de notas. */
  onFocusModeChange?: (ativo: boolean) => void;
}

const MINUTOS_ABERTURA = 15; // a sala costuma abrir antes do horário
const MINUTOS_PRESENCA = 10; // tempo conectado para registrar presença
const SEGUNDOS_RETRY = 15;
const MAX_TENTATIVAS = 120; // ~30 min aguardando o professor
const ALTURA_BARRA_ZOOM = 64; // barra de controles que o SDK desenha abaixo do vídeo

/* ─── utilitários ─────────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');

function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** Contagem até o início (só para menos de 24 h; além disso a data basta). */
function formatarContagem(ms: number): string {
  const min = Math.ceil(ms / 60000);
  if (min > 60) return `em ${Math.floor(min / 60)} h ${pad(min % 60)} min`;
  if (min > 15) return `em ${min} min`;
  return `em ${formatarDuracao(ms / 1000)}`;
}

const formatarDataHora = (d: Date) =>
  d.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

function useAgora(intervaloMs: number): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return agora;
}

/** Arquivo .ics com lembrete 15 min antes — abre direto na agenda do aluno. */
function baixarConvite(lesson: Lesson, inicio: Date, fim: Date) {
  const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const url = `${window.location.origin}/aulas/${lesson._id}`;
  const conteudo = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ECO RJ//Aulas ao vivo//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:aula-${lesson._id}@ecorj`,
    `DTSTAMP:${ics(new Date())}`,
    `DTSTART:${ics(inicio)}`,
    `DTEND:${ics(fim)}`,
    `SUMMARY:${esc(`Aula ao vivo: ${lesson.titulo}`)}`,
    `DESCRIPTION:${esc(`Entre pela plataforma ECO RJ: ${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(`Sua aula começa em 15 minutos: ${lesson.titulo}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([conteudo], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `aula-ao-vivo-${lesson._id}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Traduz falhas da API e do SDK em causa + próximo passo, em português. */
function traduzirErro(e: any): ErroSala | 'aguardar' {
  const codigoApi = e?.response?.data?.code;
  if (codigoApi) {
    switch (codigoApi) {
      case 'SEM_ACESSO':
        return { titulo: 'Acesso não liberado', detalhe: e.response.data.message || 'Sua conta não tem acesso a esta aula.', definitivo: true };
      case 'SEM_REUNIAO':
        return { titulo: 'Sala ainda não publicada', detalhe: 'O link desta aula ainda não foi configurado. Ele aparece aqui assim que a equipe publicar.', definitivo: true };
      case 'ZOOM_NAO_CONFIGURADO':
        return { titulo: 'Sala temporariamente indisponível', detalhe: 'A integração com o Zoom está em manutenção. Avise a equipe ECO RJ.', definitivo: true };
      case 'AULA_INATIVA':
        return { titulo: 'Aula indisponível', detalhe: 'Esta aula foi desativada pela coordenação.', definitivo: true };
    }
  }
  if (e?.response?.status === 401) {
    return { titulo: 'Sessão expirada', detalhe: 'Entre novamente na sua conta para acessar a aula.', definitivo: true };
  }
  if (e?.request && !e?.response && e?.isAxiosError) {
    return { titulo: 'Sem conexão', detalhe: 'Não conseguimos falar com o servidor. Verifique sua internet e tente de novo.' };
  }

  const codigo = Number(e?.errorCode ?? e?.code);
  const motivo = String(e?.reason ?? e?.message ?? '');

  if (codigo === 3008 || /not\s*start/i.test(motivo)) return 'aguardar';
  switch (codigo) {
    case 3001:
      return { titulo: 'Sala não encontrada', detalhe: 'A reunião desta aula não existe mais no Zoom. Avise a equipe ECO RJ.', definitivo: true };
    case 3004:
      return { titulo: 'Senha da sala incorreta', detalhe: 'A senha cadastrada para esta aula não confere. Avise a equipe ECO RJ.', definitivo: true };
    case 3009:
      return { titulo: 'Você foi removido da aula', detalhe: 'O professor removeu sua participação desta sessão.', definitivo: true };
    case 3099:
    case 3100:
      return { titulo: 'Sala exige cadastro no Zoom', detalhe: 'Esta reunião está configurada para aceitar só usuários registrados. Avise a equipe ECO RJ.', definitivo: true };
    case 3633:
    case 3634:
      return { titulo: 'Muitas tentativas seguidas', detalhe: 'Aguarde alguns segundos e tente entrar de novo.' };
    case 3712:
      return { titulo: 'Não conseguimos validar a sala', detalhe: 'As credenciais da integração com o Zoom precisam ser revisadas. Avise a equipe ECO RJ.', definitivo: true };
  }
  if (/permission|NotAllowed/i.test(motivo)) {
    return { titulo: 'Permissão negada pelo navegador', detalhe: 'Libere microfone e câmera para este site no cadeado da barra de endereço e tente de novo.' };
  }
  return { titulo: 'Não foi possível entrar', detalhe: 'Algo interrompeu a conexão com a sala. Tente de novo; se persistir, recarregue a página.' };
}

/* ─── componente ──────────────────────────────────────────────────────── */

const LiveClassRoom: React.FC<LiveClassRoomProps> = ({
  lesson,
  userName,
  userEmail,
  integratedEnabled,
  alreadyAttended,
  onAttendance,
  onOpenNotes,
  hasExercises,
  onGoToExercises,
  onFocusModeChange
}) => {
  const [fase, setFase] = useState<Fase>('pronta');
  const [etapa, setEtapa] = useState<Etapa>('acesso');
  const [erro, setErro] = useState<ErroSala | null>(null);
  const [reconectando, setReconectando] = useState(false);
  const [participantes, setParticipantes] = useState<number | null>(null);
  const [foco, setFoco] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [entrouEm, setEntrouEm] = useState<number | null>(null);
  const [presencaRegistrada, setPresencaRegistrada] = useState(alreadyAttended);
  const [proximaTentativa, setProximaTentativa] = useState<number | null>(null);
  const [mostrarAlternativa, setMostrarAlternativa] = useState(false);
  const [credExternas, setCredExternas] = useState<{ meetingNumber: string; password: string } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRootRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const sdkRef = useRef<any>(null);
  const saindoRef = useRef(false);
  const tentativasRef = useRef(0);
  const montadoRef = useRef(true);
  // Os handlers mudam a cada render; o SDK recebe wrappers estáveis (para o off funcionar)
  const handlersRef = useRef<{ conexao: (p: any) => void; contagem: () => void }>({
    conexao: () => undefined,
    contagem: () => undefined
  });
  const ouvintes = useRef({
    conexao: (p: any) => handlersRef.current.conexao(p),
    contagem: () => handlersRef.current.contagem()
  }).current;

  const agora = useAgora(1000);

  // Largura real do palco (a coluna da aula varia com o menu lateral, não só com a tela)
  const [larguraPalco, setLarguraPalco] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entrada]) => setLarguraPalco(Math.round(entrada.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const barraLarga = foco || larguraPalco >= 760;
  const temSala = !!lesson.zoomMeetingId;

  /* Janela de horário da aula */
  const { inicio, fim, janela } = useMemo(() => {
    const ini = lesson.dataHoraInicio ? new Date(lesson.dataHoraInicio) : null;
    if (!ini || Number.isNaN(ini.getTime())) return { inicio: null, fim: null, janela: 'sem_data' as Janela };
    const f = new Date(ini.getTime() + (lesson.duracao && lesson.duracao > 0 ? lesson.duracao : 120) * 60000);
    let j: Janela = 'ao_vivo';
    if (agora < ini.getTime() - MINUTOS_ABERTURA * 60000) j = 'futura';
    else if (agora < ini.getTime()) j = 'abrindo';
    else if (agora > f.getTime()) j = 'terminou';
    return { inicio: ini, fim: f, janela: j };
  }, [lesson.dataHoraInicio, lesson.duracao, agora]);

  useEffect(() => setPresencaRegistrada((p) => p || alreadyAttended), [alreadyAttended]);

  /* ── tamanho do vídeo: preenche o palco ─────────────────────────────── */
  const medirVideo = useCallback(() => {
    const stage = stageRef.current;
    const largura = Math.max(320, Math.round(stage?.clientWidth || 640));
    const altura = foco
      ? Math.max(180, Math.round((stage?.clientHeight || 480) - ALTURA_BARRA_ZOOM))
      : Math.round((largura * 9) / 16);
    return { width: largura, height: altura };
  }, [foco]);

  useEffect(() => {
    if (fase !== 'na_aula' || !stageRef.current) return;
    let raf = 0;
    const aplicar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          clientRef.current?.updateVideoOptions?.({ viewSizes: { default: medirVideo() } });
        } catch {
          /* o SDK pode estar desmontando */
        }
      });
    };
    const ro = new ResizeObserver(aplicar);
    ro.observe(stageRef.current);
    aplicar();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [fase, medirVideo]);

  /* ── ciclo de vida do cliente Zoom ──────────────────────────────────── */
  const descartarCliente = useCallback(() => {
    const client = clientRef.current;
    clientRef.current = null;
    if (!client) return;
    try {
      client.off?.('connection-change', ouvintes.conexao);
      client.off?.('user-added', ouvintes.contagem);
      client.off?.('user-removed', ouvintes.contagem);
    } catch {
      /* noop */
    }
    try {
      sdkRef.current?.destroyClient?.();
    } catch {
      /* noop */
    }
  }, [ouvintes]);

  const atualizarContagem = useCallback(() => {
    try {
      const lista = clientRef.current?.getAttendeeslist?.();
      if (Array.isArray(lista)) setParticipantes(lista.length);
    } catch {
      /* noop */
    }
  }, []);

  const aoMudarConexao = useCallback(
    (payload: any) => {
      const estado = payload?.state;
      if (estado === 'Reconnecting') setReconectando(true);
      if (estado === 'Connected') setReconectando(false);
      if (estado === 'Closed' || estado === 'Fail') {
        setReconectando(false);
        const foiOAluno = saindoRef.current;
        descartarCliente();
        setFoco(false);
        setEntrouEm(null);
        if (!montadoRef.current) return;
        if (estado === 'Fail') {
          setErro({ titulo: 'A conexão caiu', detalhe: 'Perdemos o contato com a sala. Clique em tentar de novo para voltar.' });
          setFase('erro');
        } else {
          setFase(foiOAluno ? 'saiu' : 'encerrada');
        }
      }
    },
    [descartarCliente]
  );

  handlersRef.current = { conexao: aoMudarConexao, contagem: atualizarContagem };

  const entrar = useCallback(async () => {
    if (!zoomRootRef.current) return;
    saindoRef.current = false;
    setErro(null);
    setMostrarAlternativa(false);
    setProximaTentativa(null);
    setFase('conectando');
    setEtapa('acesso');

    try {
      const { data } = await zoomService.joinCredentials(lesson._id);
      if (!montadoRef.current) return;
      setEtapa('sala');

      const modulo: any = await import('@zoom/meetingsdk/embedded');
      const ZoomMtgEmbedded = modulo.default || modulo;
      sdkRef.current = ZoomMtgEmbedded;
      descartarCliente(); // uma tentativa anterior pode ter deixado um cliente

      const client = ZoomMtgEmbedded.createClient();
      clientRef.current = client;

      await client.init({
        zoomAppRoot: zoomRootRef.current,
        language: 'pt-PT', // o SDK não tem pt-BR
        patchJsMedia: true,
        leaveOnPageUnload: true,
        customize: {
          video: {
            isResizable: false,
            popper: { disableDraggable: true },
            viewSizes: { default: medirVideo() },
            defaultViewType: 'speaker' as any
          },
          meetingInfo: ['topic', 'host', 'participant'],
          chat: { popper: { disableDraggable: false, anchorElement: zoomRootRef.current, placement: 'left' } as any },
          participants: { popper: { disableDraggable: false, anchorElement: zoomRootRef.current, placement: 'left' } as any }
        }
      });

      client.on('connection-change', ouvintes.conexao);
      client.on('user-added', ouvintes.contagem);
      client.on('user-removed', ouvintes.contagem);

      if (!montadoRef.current) return descartarCliente();
      setEtapa('entrando');

      await client.join({
        signature: data.signature,
        meetingNumber: data.meetingNumber,
        password: data.password,
        userName,
        userEmail
      });

      if (!montadoRef.current) return;
      tentativasRef.current = 0;
      setEntrouEm(Date.now());
      setFase('na_aula');
      atualizarContagem();
    } catch (e: any) {
      descartarCliente();
      if (!montadoRef.current) return;
      const resultado = traduzirErro(e);
      if (resultado === 'aguardar') {
        tentativasRef.current += 1;
        if (tentativasRef.current > MAX_TENTATIVAS) {
          setErro({ titulo: 'A sala não abriu', detalhe: 'Esperamos 30 minutos e o professor não iniciou a reunião. Verifique os avisos do curso.' });
          setFase('erro');
          return;
        }
        setProximaTentativa(Date.now() + SEGUNDOS_RETRY * 1000);
        setFase('aguardando');
        return;
      }
      if (!(e?.response)) console.error('[Zoom] Falha ao entrar:', e);
      setErro(resultado);
      setFase('erro');
    }
  }, [lesson._id, userName, userEmail, descartarCliente, medirVideo, atualizarContagem, ouvintes]);

  /* nova tentativa automática enquanto o professor não abre a sala */
  useEffect(() => {
    if (fase !== 'aguardando' || !proximaTentativa) return;
    const id = setTimeout(() => entrar(), Math.max(0, proximaTentativa - Date.now()));
    return () => clearTimeout(id);
  }, [fase, proximaTentativa, entrar]);

  const sair = useCallback(async () => {
    setConfirmarSaida(false);
    saindoRef.current = true;
    const client = clientRef.current;
    try {
      await client?.leaveMeeting?.();
    } catch {
      /* 5004 = já fora da reunião */
    }
    // se o SDK não emitir "Closed", fechamos nós mesmos
    if (clientRef.current) {
      descartarCliente();
      setFoco(false);
      setEntrouEm(null);
      setFase('saiu');
    }
  }, [descartarCliente]);

  /* desmontagem: sair da reunião e liberar o SDK */
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      saindoRef.current = true;
      const client = clientRef.current;
      if (client) {
        Promise.resolve(client.leaveMeeting?.())
          .catch(() => undefined)
          .finally(() => {
            try {
              sdkRef.current?.destroyClient?.();
            } catch {
              /* noop */
            }
          });
        clientRef.current = null;
      }
    };
  }, []);

  /* aviso ao recarregar/fechar a aba durante a aula */
  useEffect(() => {
    if (fase !== 'na_aula') return;
    const aviso = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = 'Você está em uma aula ao vivo. Deseja sair?';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [fase]);

  /* presença: registrada após MINUTOS_PRESENCA conectado */
  const segundosNaAula = entrouEm ? Math.floor((agora - entrouEm) / 1000) : 0;
  useEffect(() => {
    if (fase === 'na_aula' && !presencaRegistrada && segundosNaAula >= MINUTOS_PRESENCA * 60) {
      setPresencaRegistrada(true);
      onAttendance();
    }
  }, [fase, presencaRegistrada, segundosNaAula, onAttendance]);

  /* modo foco: ocupa a tela inteira sem tirar o Zoom da página */
  useEffect(() => {
    onFocusModeChange?.(foco);
    if (!foco) {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
      return;
    }
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // tela cheia do documento inteiro (não do palco): assim os painéis do Zoom,
    // que são renderizados fora do palco, continuam visíveis
    document.documentElement.requestFullscreen?.().catch(() => undefined);
    const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && setFoco(false);
    const saiuDaTelaCheia = () => !document.fullscreenElement && setFoco(false);
    window.addEventListener('keydown', esc);
    document.addEventListener('fullscreenchange', saiuDaTelaCheia);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', esc);
      document.removeEventListener('fullscreenchange', saiuDaTelaCheia);
    };
  }, [foco, onFocusModeChange]);

  /* confirmação de saída em dois cliques, sem modal */
  useEffect(() => {
    if (!confirmarSaida) return;
    const id = setTimeout(() => setConfirmarSaida(false), 4000);
    return () => clearTimeout(id);
  }, [confirmarSaida]);

  /* alternativa: aplicativo Zoom (só após erro ou com a sala integrada desligada) */
  const abrirNoApp = useCallback(async () => {
    try {
      const { data } = await zoomService.joinCredentials(lesson._id);
      setCredExternas({ meetingNumber: data.meetingNumber, password: data.password });
      const pwd = data.password ? `&pwd=${encodeURIComponent(data.password)}` : '';
      window.location.href = `zoommtg://zoom.us/join?action=join&confno=${data.meetingNumber}${pwd}&uname=${encodeURIComponent(userName)}`;
    } catch (e) {
      const r = traduzirErro(e);
      toast.error(r === 'aguardar' ? 'A sala ainda não abriu.' : r.titulo);
    }
  }, [lesson._id, userName]);

  const copiar = (texto: string, rotulo: string) => {
    navigator.clipboard?.writeText(texto).then(
      () => toast.success(`${rotulo} copiado`),
      () => toast.error('Não foi possível copiar')
    );
  };

  /* ─── apresentação ─────────────────────────────────────────────────── */

  const naAula = fase === 'na_aula';
  const professor = lesson.professor?.trim();
  const msParaInicio = inicio ? inicio.getTime() - agora : 0;

  const statusHorario = (() => {
    switch (janela) {
      case 'ao_vivo':
        return { rotulo: 'Ao vivo agora', vivo: true };
      case 'abrindo':
        return { rotulo: `Começa ${formatarContagem(msParaInicio)}`, vivo: false };
      case 'futura':
        return {
          rotulo: msParaInicio < 24 * 3600000 ? `${formatarDataHora(inicio!)} · ${formatarContagem(msParaInicio)}` : formatarDataHora(inicio!),
          vivo: false
        };
      case 'terminou':
        return { rotulo: 'Horário encerrado', vivo: false };
      default:
        return null;
    }
  })();

  const botaoPrimario =
    'inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-primary-500 text-white font-semibold ' +
    'shadow-[0_6px_20px_-6px_rgba(30,144,255,0.65)] transition-[background-color,transform,box-shadow] duration-300 ' +
    'hover:bg-primary-600 hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]';
  const botaoSecundario =
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-white/15 text-slate-100 font-medium ' +
    'transition-colors duration-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300';
  const botaoBarra =
    'inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors duration-300 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300';

  const Pilula = statusHorario && (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-xs font-medium text-slate-200 tabular-nums">
      {statusHorario.vivo ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      ) : (
        <span className="h-2 w-2 rounded-full bg-slate-400" />
      )}
      {statusHorario.rotulo}
    </span>
  );

  const etapas: { id: Etapa; rotulo: string }[] = [
    { id: 'acesso', rotulo: 'Confirmando seu acesso' },
    { id: 'sala', rotulo: 'Preparando a sala' },
    { id: 'entrando', rotulo: 'Entrando na aula' }
  ];
  const indiceEtapa = etapas.findIndex((e) => e.id === etapa);

  const alternativaExterna = (
    <div className="mt-5 w-full max-w-md text-sm">
      {!mostrarAlternativa ? (
        <button
          type="button"
          onClick={() => setMostrarAlternativa(true)}
          className="text-slate-300 underline underline-offset-4 decoration-white/30 hover:text-white hover:decoration-white"
        >
          Prefere usar o aplicativo Zoom?
        </button>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left">
          <p className="text-slate-300 mb-3">
            Abre a mesma aula no aplicativo instalado no seu computador ou celular.
          </p>
          <button type="button" onClick={abrirNoApp} className={botaoSecundario}>
            <Video className="w-4 h-4" />
            Abrir no aplicativo Zoom
          </button>
          {credExternas && (
            <dl className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 text-slate-300">
              <dt>ID</dt>
              <dd className="font-mono text-slate-100 tabular-nums">{credExternas.meetingNumber}</dd>
              <button type="button" onClick={() => copiar(credExternas.meetingNumber, 'ID')} className="p-1.5 rounded-md hover:bg-white/10" aria-label="Copiar ID da reunião">
                <Copy className="w-4 h-4" />
              </button>
              {credExternas.password && (
                <>
                  <dt>Senha</dt>
                  <dd className="font-mono text-slate-100">{credExternas.password}</dd>
                  <button type="button" onClick={() => copiar(credExternas.password, 'Senha')} className="p-1.5 rounded-md hover:bg-white/10" aria-label="Copiar senha da reunião">
                    <Copy className="w-4 h-4" />
                  </button>
                </>
              )}
            </dl>
          )}
        </div>
      )}
    </div>
  );

  const acoesPosAula = (
    <div className="flex flex-col sm:flex-row gap-3">
      {hasExercises && (
        <button type="button" onClick={onGoToExercises} className={botaoPrimario}>
          Fazer os exercícios
        </button>
      )}
      <button type="button" onClick={entrar} className={hasExercises ? botaoSecundario : botaoPrimario}>
        <RefreshCw className="w-4 h-4" />
        Voltar para a aula
      </button>
    </div>
  );

  const linhaPresenca = (
    <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300">
      {presencaRegistrada ? (
        <>
          <UserCheck className="w-4 h-4 text-emerald-400" />
          Presença registrada nesta aula.
        </>
      ) : (
        <>
          <UserCheck className="w-4 h-4 text-slate-400" />
          A presença é registrada após {MINUTOS_PRESENCA} min na aula.
        </>
      )}
    </p>
  );

  /* conteúdo sobreposto ao palco quando ainda não estamos na aula */
  const painel = (() => {
    switch (fase) {
      case 'conectando':
        return (
          <div className="w-full max-w-sm" role="status" aria-live="polite">
            <h3 className="font-heading text-xl font-semibold text-white mb-5">Preparando sua aula</h3>
            <ol className="space-y-3">
              {etapas.map((e, i) => {
                const feita = i < indiceEtapa;
                const atual = i === indiceEtapa;
                return (
                  <li key={e.id} className={`flex items-center gap-3 text-sm ${atual ? 'text-white' : feita ? 'text-slate-300' : 'text-slate-500'}`}>
                    {feita ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : atual ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary-300" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    {e.rotulo}
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 text-xs text-slate-400">Na primeira vez, o navegador pode pedir acesso ao microfone e à câmera.</p>
          </div>
        );

      case 'aguardando': {
        const restante = proximaTentativa ? Math.max(0, Math.ceil((proximaTentativa - agora) / 1000)) : 0;
        return (
          <div className="w-full max-w-md" role="status" aria-live="polite">
            {Pilula && <div className="mb-4">{Pilula}</div>}
            <h3 className="font-heading text-xl sm:text-2xl font-semibold text-white mb-2">
              {professor ? `${professor} ainda não abriu a sala` : 'O professor ainda não abriu a sala'}
            </h3>
            <p className="text-slate-300 mb-6">
              Pode deixar esta página aberta: você entra sozinho assim que a aula começar.
              <span className="block mt-1 text-slate-400 tabular-nums">Nova tentativa em {restante} s.</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={entrar} className={botaoPrimario}>
                <RefreshCw className="w-4 h-4" />
                Tentar agora
              </button>
              <button
                type="button"
                onClick={() => {
                  setProximaTentativa(null);
                  tentativasRef.current = 0;
                  setFase('pronta');
                }}
                className={botaoSecundario}
              >
                Parar de esperar
              </button>
            </div>
          </div>
        );
      }

      case 'saiu':
        return (
          <div className="w-full max-w-md">
            <h3 className="font-heading text-xl sm:text-2xl font-semibold text-white mb-2">Você saiu da aula</h3>
            <p className="text-slate-300 mb-6">
              {janela === 'terminou' ? 'Fixe o conteúdo enquanto ele está fresco.' : 'A aula continua acontecendo. Você pode voltar quando quiser.'}
            </p>
            {acoesPosAula}
            {linhaPresenca}
          </div>
        );

      case 'encerrada':
        return (
          <div className="w-full max-w-md">
            <CheckCircle className="w-8 h-8 text-emerald-400 mb-4" aria-hidden />
            <h3 className="font-heading text-xl sm:text-2xl font-semibold text-white mb-2">A aula foi encerrada</h3>
            <p className="text-slate-300 mb-6">
              Obrigado por participar{professor ? ` da aula com ${professor}` : ''}. A gravação, quando publicada, aparece nesta página.
            </p>
            {hasExercises ? (
              <button type="button" onClick={onGoToExercises} className={botaoPrimario}>
                Fazer os exercícios
              </button>
            ) : (
              <button type="button" onClick={entrar} className={botaoSecundario}>
                <RefreshCw className="w-4 h-4" />
                Tentar entrar de novo
              </button>
            )}
            {linhaPresenca}
          </div>
        );

      case 'erro':
        return (
          <div className="w-full max-w-md" role="alert">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-4" aria-hidden />
            <h3 className="font-heading text-xl sm:text-2xl font-semibold text-white mb-2">{erro?.titulo}</h3>
            <p className="text-slate-300 mb-6">{erro?.detalhe}</p>
            {!erro?.definitivo && (
              <button type="button" onClick={entrar} className={botaoPrimario}>
                <RefreshCw className="w-4 h-4" />
                Tentar de novo
              </button>
            )}
            {temSala && alternativaExterna}
          </div>
        );

      default: {
        // pronta
        if (!temSala) {
          return (
            <div className="w-full max-w-md">
              {Pilula && <div className="mb-4">{Pilula}</div>}
              <h3 className="font-heading text-xl sm:text-2xl font-semibold text-white mb-2">A sala desta aula ainda não foi publicada</h3>
              <p className="text-slate-300 mb-6">Ela vai aparecer aqui, nesta página, antes do horário de início.</p>
              {inicio && fim && janela !== 'terminou' && (
                <button type="button" onClick={() => baixarConvite(lesson, inicio, fim)} className={botaoSecundario}>
                  <CalendarPlus className="w-4 h-4" />
                  Adicionar à agenda
                </button>
              )}
            </div>
          );
        }

        const titulo =
          janela === 'terminou'
            ? 'O horário desta aula já passou'
            : janela === 'futura'
              ? 'Sua aula ao vivo está agendada'
              : professor
                ? `Aula ao vivo com ${professor}`
                : 'Sua aula ao vivo';

        return (
          <div className="w-full max-w-lg">
            {Pilula && <div className="mb-4">{Pilula}</div>}
            <h3 className="font-heading text-2xl sm:text-[1.75rem] leading-tight font-semibold text-white mb-2 text-balance">{titulo}</h3>
            <p className="text-slate-300 mb-6">
              {janela === 'terminou'
                ? 'Se o professor ainda estiver na sala, você consegue entrar normalmente.'
                : integratedEnabled
                  ? <>A aula acontece aqui mesmo, nesta página. Você entra como <strong className="font-semibold text-white">{userName}</strong>.</>
                  : <>Esta aula é transmitida pelo aplicativo Zoom. Você entra como <strong className="font-semibold text-white">{userName}</strong>.</>}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {integratedEnabled ? (
                <button type="button" onClick={entrar} className={botaoPrimario}>
                  <Video className="w-5 h-5" />
                  {janela === 'terminou' ? 'Tentar entrar' : 'Entrar na aula'}
                </button>
              ) : (
                <button type="button" onClick={abrirNoApp} className={botaoPrimario}>
                  <Video className="w-5 h-5" />
                  Abrir no aplicativo Zoom
                </button>
              )}
              {inicio && fim && (janela === 'futura' || janela === 'abrindo') && (
                <button type="button" onClick={() => baixarConvite(lesson, inicio, fim)} className={botaoSecundario}>
                  <CalendarPlus className="w-4 h-4" />
                  Adicionar à agenda
                </button>
              )}
            </div>

            {janela !== 'terminou' && (
              <ul className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                <li className="inline-flex items-center gap-2">
                  <Headphones className="w-4 h-4" aria-hidden />
                  Use fones de ouvido para evitar eco
                </li>
                <li className="inline-flex items-center gap-2">
                  <UserCheck className="w-4 h-4" aria-hidden />
                  {presencaRegistrada ? 'Presença já registrada' : `Presença registrada após ${MINUTOS_PRESENCA} min`}
                </li>
              </ul>
            )}

            {!integratedEnabled && credExternas && alternativaExterna}
          </div>
        );
      }
    }
  })();

  return (
    <section
      aria-label="Aula ao vivo"
      className={
        foco
          ? 'fixed inset-0 z-[60] flex flex-col bg-[#070b14]'
          : 'rounded-2xl overflow-hidden bg-[#0b1220] shadow-[0_12px_40px_-12px_rgba(10,22,40,0.45)]'
      }
    >
      {/* Barra da aula — fora da área do Zoom para não cobrir os controles dele */}
      {naAula && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-white/10 bg-[#0b1220] text-slate-200">
          <div className="flex items-center gap-3 sm:gap-4 text-sm min-w-0">
            <span className="inline-flex items-center gap-2 font-semibold text-white tabular-nums">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Ao vivo · {formatarDuracao(segundosNaAula)}
            </span>
            {participantes !== null && participantes > 0 && (
              <span className={`${larguraPalco >= 420 ? 'inline-flex' : 'hidden'} items-center gap-1.5 text-slate-300 tabular-nums`}>
                <Users className="w-4 h-4" aria-hidden />
                {participantes} {participantes === 1 ? 'participante' : 'participantes'}
              </span>
            )}
            <span className={`${foco || larguraPalco >= 680 ? 'inline-flex' : 'hidden'} items-center gap-1.5 ${presencaRegistrada ? 'text-emerald-400' : 'text-slate-400'} tabular-nums`}>
              <UserCheck className="w-4 h-4" aria-hidden />
              {presencaRegistrada
                ? 'Presença registrada'
                : `Presença em ${formatarDuracao(Math.max(0, MINUTOS_PRESENCA * 60 - segundosNaAula))}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onOpenNotes} className={`${botaoBarra} text-slate-200 hover:bg-white/10`} aria-label="Abrir minhas notas" title="Minhas notas">
              <StickyNote className="w-4 h-4" />
              {barraLarga && <span>Notas</span>}
            </button>
            <button
              type="button"
              onClick={() => setFoco((f) => !f)}
              className={`${botaoBarra} text-slate-200 hover:bg-white/10`}
              aria-pressed={foco}
              aria-label={foco ? 'Sair do modo foco' : 'Modo foco: aula em tela inteira'}
              title={foco ? 'Sair do modo foco (Esc)' : 'Modo foco'}
            >
              {foco ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {barraLarga && <span>{foco ? 'Sair do modo foco' : 'Modo foco'}</span>}
            </button>
            <button
              type="button"
              onClick={() => (confirmarSaida ? sair() : setConfirmarSaida(true))}
              className={`${botaoBarra} ${confirmarSaida ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-300 hover:bg-red-500/15'}`}
              aria-label={confirmarSaida ? 'Confirmar saída da aula' : 'Sair da aula'}
            >
              <LogOut className="w-4 h-4" />
              {(confirmarSaida || larguraPalco >= 420) && <span>{confirmarSaida ? 'Confirmar saída' : 'Sair da aula'}</span>}
            </button>
          </div>
        </div>
      )}

      {reconectando && naAula && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 text-amber-200 text-sm" role="status">
          <WifiOff className="w-4 h-4" />
          Conexão instável. Reconectando à aula…
        </div>
      )}

      {/* Palco: o SDK monta o Zoom em zoomRootRef; os painéis ficam por cima até entrar */}
      <div
        ref={stageRef}
        className={`relative w-full ${foco ? 'flex-1 min-h-0' : ''}`}
        style={
          foco
            ? undefined
            : naAula
              ? { aspectRatio: '16 / 9', minHeight: 0, paddingBottom: ALTURA_BARRA_ZOOM, boxSizing: 'content-box' }
              : undefined
        }
      >
        <div
          ref={zoomRootRef}
          id="zoom-meeting-container"
          className="absolute inset-0"
          aria-hidden={!naAula}
        />

        {!naAula && (
          <div className="relative z-10 flex min-h-[360px] items-center px-6 py-10 sm:px-10 lg:px-14 bg-[#0b1220] bg-[radial-gradient(120%_80%_at_100%_0%,rgba(30,144,255,0.16),transparent_60%)] animate-fade-in">
            {/* espaçador 16:9: altura mínima proporcional à largura, mas cresce com o conteúdo */}
            <div aria-hidden className="hidden sm:block w-0 shrink-0 -my-10 pt-[56.25%]" />
            {painel}
          </div>
        )}
      </div>
    </section>
  );
};

export default LiveClassRoom;

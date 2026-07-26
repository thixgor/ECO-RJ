import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    X, ChevronLeft, ChevronRight, Check, XCircle, AlertTriangle, Award, Target,
    RotateCcw, Brain, GraduationCap, Lightbulb, BookMarked, Activity, Keyboard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exerciseService } from '../../services/api';
import EcgTransition, { ECG_TRANSITION_MS } from './EcgTransition';
import type { Exercise, QuestionCheck } from '../../types';

/** Resultado final devolvido por POST /exercises/:id/answer */
export interface ExerciseResult {
    nota: number;
    tentativa: number;
    tentativasRestantes: number;
    questoes: Array<{
        pergunta: string;
        opcoes?: string[];
        suaResposta: any;
        respostaCorreta: any;
        correto: boolean;
        imagem?: string;
        respostaComentada?: string;
        fonteBibliografica?: string;
    }>;
}

/**
 * Modo de resolução.
 *  - `estudo`: corrige cada questão na hora, com comentário e fonte. É o padrão,
 *    porque guardar todo o gabarito para o final não ensina nada.
 *  - `prova`: sem feedback até enviar (para simulados / avaliações).
 */
export type ExerciseMode = 'estudo' | 'prova';

export const MODE_STORAGE_KEY = 'eco-rj-exercise-mode';

const letra = (i: number) => String.fromCharCode(65 + i);

/** Comentário do professor + fonte bibliográfica de uma questão. */
export const Explicacao: React.FC<{ comentario?: string; fonte?: string }> = ({ comentario, fonte }) => {
    if (!comentario && !fonte) return null;
    return (
        <div className="mt-3 pt-3 border-t border-[var(--glass-border)] space-y-2">
            {comentario && (
                <div>
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
                        Comentário
                    </p>
                    <div className="text-sm text-[var(--color-text-secondary)] mt-1 pl-2.5 border-l-2 border-blue-500/30">
                        {comentario}
                    </div>
                </div>
            )}
            {fonte && (
                <div>
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5">
                        <BookMarked className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        Fonte
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 pl-2.5">{fonte}</p>
                </div>
            )}
        </div>
    );
};

interface Props {
    /** Exercício já carregado (sem gabarito) — o player não busca sozinho. */
    exercise: Exercise;
    /** Fecha o player. Recebe `true` quando o exercício foi enviado. */
    onClose: (enviado: boolean) => void;
    /** Chamado após o envio, com o resultado (para atualizar listas/progresso). */
    onSubmitted?: (result: ExerciseResult) => void;
    /** Reinicia o mesmo exercício (botão "Refazer" na tela de resultado). */
    onRestart?: () => void;
}

/**
 * Player de exercícios da plataforma.
 *
 * Usado tanto na página de Exercícios quanto dentro de uma aula, para que a
 * experiência de responder seja exatamente a mesma nos dois lugares:
 * correção imediata com comentário, paleta de questões colorida por acerto,
 * atalhos de teclado e transição eletrocardiográfica entre as questões.
 */
const ExercisePlayer: React.FC<Props> = ({ exercise, onClose, onSubmitted, onRestart }) => {
    const [mode, setMode] = useState<ExerciseMode>(() => {
        if (exercise.mostrarRespostas === false) return 'prova';
        return localStorage.getItem(MODE_STORAGE_KEY) === 'prova' ? 'prova' : 'estudo';
    });
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(number | string | null)[]>(
        () => new Array(exercise.questoes.length).fill(null)
    );
    /** Correção por questão no modo estudo (índice → gabarito). */
    const [checks, setChecks] = useState<Record<number, QuestionCheck>>({});
    const [checking, setChecking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<ExerciseResult | null>(null);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [transitioning, setTransitioning] = useState(false);

    const transitionTimer = useRef<number | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => () => {
        if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    }, []);

    useEffect(() => {
        localStorage.setItem(MODE_STORAGE_KEY, mode);
    }, [mode]);

    const questaoAtual = exercise.questoes[currentQuestionIndex];
    const totalQuestions = exercise.questoes.length;
    const answeredCount = answers.filter(a => a !== null).length;
    const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    const checkAtual = checks[currentQuestionIndex];
    /** No modo estudo a questão trava depois de corrigida. */
    const travada = mode === 'estudo' && !!checkAtual;
    const acertosAteAgora = Object.values(checks).filter(c => c.correto).length;
    const corrigidasAteAgora = Object.keys(checks).length;

    const handleClose = () => {
        if (result) {
            onClose(true);
        } else if (!showStartScreen && answers.some(a => a !== null)) {
            if (confirm('Tem certeza que deseja sair? Suas respostas serão perdidas.')) onClose(false);
        } else {
            onClose(false);
        }
    };

    const selectAnswer = useCallback(async (answer: number | string) => {
        if (travada || checking) return;

        setAnswers(prev => {
            const next = [...prev];
            next[currentQuestionIndex] = answer;
            return next;
        });

        if (mode !== 'estudo') return;

        // Modo estudo: corrige na hora, com comentário e fonte.
        setChecking(true);
        try {
            const res = await exerciseService.check(exercise._id, currentQuestionIndex, answer);
            setChecks(prev => ({ ...prev, [currentQuestionIndex]: res.data }));
        } catch (error: any) {
            if (error.response?.data?.modoProva) {
                setMode('prova');
                toast('Este exercício mostra a correção apenas no final.', { icon: '📋' });
            } else {
                toast.error(error.response?.data?.message || 'Não foi possível corrigir agora');
            }
        } finally {
            setChecking(false);
        }
    }, [exercise._id, currentQuestionIndex, mode, travada, checking]);

    /** Navega para uma questão tocando a animação de ECG. */
    const goToQuestion = useCallback((index: number) => {
        if (index < 0 || index >= totalQuestions) return;
        if (index === currentQuestionIndex) return;

        setTransitioning(true);
        if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
        // Troca a questão na metade da animação, para o traçado "cobrir" a virada.
        transitionTimer.current = window.setTimeout(() => {
            setCurrentQuestionIndex(index);
            bodyRef.current?.scrollTo({ top: 0 });
            setTransitioning(false);
        }, Math.round(ECG_TRANSITION_MS * 0.45));
    }, [currentQuestionIndex, totalQuestions]);

    const submitExercise = useCallback(async () => {
        const unansweredCount = answers.filter(a => a === null).length;
        if (unansweredCount > 0 && !showConfirmSubmit) {
            setShowConfirmSubmit(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await exerciseService.answer(exercise._id, answers);
            setResult(response.data);
            onSubmitted?.(response.data);
            bodyRef.current?.scrollTo({ top: 0 });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao enviar respostas');
        } finally {
            setIsSubmitting(false);
            setShowConfirmSubmit(false);
        }
    }, [exercise._id, answers, showConfirmSubmit, onSubmitted]);

    // ---- Atalhos de teclado ----
    useEffect(() => {
        if (showStartScreen || result) return;

        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

            const opcoes = questaoAtual?.opcoes || [];

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToQuestion(currentQuestionIndex + 1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToQuestion(currentQuestionIndex - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentQuestionIndex < totalQuestions - 1) goToQuestion(currentQuestionIndex + 1);
                else submitExercise();
            } else if (/^[1-9]$/.test(e.key)) {
                const idx = Number(e.key) - 1;
                if (idx < opcoes.length) { e.preventDefault(); selectAnswer(idx); }
            } else if (/^[a-eA-E]$/.test(e.key)) {
                const idx = e.key.toUpperCase().charCodeAt(0) - 65;
                if (idx < opcoes.length) { e.preventDefault(); selectAnswer(idx); }
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [showStartScreen, result, currentQuestionIndex, questaoAtual, totalQuestions, selectAnswer, goToQuestion, submitExercise]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
            <div className="bg-white dark:bg-[#1a1c1e] sm:rounded-2xl w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[92vh] overflow-hidden flex flex-col animate-fade-in shadow-2xl border border-transparent dark:border-white/10">

                {/* Header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 sm:p-6 flex-shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-xl font-bold truncate">{exercise.titulo}</h2>
                            <p className="text-primary-100 text-sm mt-1">
                                {result
                                    ? 'Resultado do exercício'
                                    : showStartScreen
                                        ? `${totalQuestions} questões · escolha como quer resolver`
                                        : `Questão ${currentQuestionIndex + 1} de ${totalQuestions}`}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                            aria-label="Fechar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {!result && !showStartScreen && (
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-primary-100 mb-1">
                                <span>
                                    {answeredCount} de {totalQuestions} respondidas
                                    {mode === 'estudo' && corrigidasAteAgora > 0 && (
                                        <> · {acertosAteAgora}/{corrigidasAteAgora} corretas</>
                                    )}
                                </span>
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

                {/* Corpo */}
                <div ref={bodyRef} className="flex-1 overflow-y-auto relative">
                    {/* Animação eletrocardiográfica na virada de questão */}
                    <EcgTransition
                        active={transitioning}
                        label={`Questão ${currentQuestionIndex + 1} de ${totalQuestions}`}
                    />

                    {showStartScreen ? (
                        /* ---- Tela de escolha de modo ---- */
                        <div className="p-4 sm:p-6 space-y-4">
                            <p className="text-sm text-[var(--color-text-secondary)]">
                                Como você quer resolver este exercício?
                            </p>

                            <button
                                onClick={() => setMode('estudo')}
                                disabled={exercise.mostrarRespostas === false}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'estudo'
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                                    : 'border-gray-200 dark:border-white/10 hover:border-primary-300'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                                        <Brain className="w-5 h-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--color-text-primary)]">
                                            Modo Estudo <span className="text-xs font-normal text-primary-500">· recomendado</span>
                                        </p>
                                        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                                            Corrige na hora: ao marcar uma alternativa você já vê se acertou,
                                            a resposta correta, o comentário do professor e a fonte bibliográfica.
                                        </p>
                                        {exercise.mostrarRespostas === false && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                Indisponível: este exercício foi configurado para revelar o gabarito só no final.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setMode('prova')}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${mode === 'prova'
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                                    : 'border-gray-200 dark:border-white/10 hover:border-amber-300'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                                        <GraduationCap className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--color-text-primary)]">Modo Prova</p>
                                        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                                            Simula uma avaliação: você responde tudo, pode revisar e trocar as
                                            respostas, e a correção aparece só ao finalizar.
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--color-text-muted)]">
                                <Keyboard className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>
                                    Atalhos: <strong>1-5</strong> ou <strong>A-E</strong> marcam a alternativa,
                                    <strong> ← →</strong> navegam entre questões e <strong>Enter</strong> avança.
                                </span>
                            </div>
                        </div>
                    ) : result ? (
                        /* ---- Resultado ---- */
                        <div className="p-4 sm:p-6 space-y-6">
                            <div className={`text-center p-6 sm:p-8 rounded-2xl ${result.nota >= 70
                                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/20 border border-emerald-100 dark:border-emerald-500/20'
                                : result.nota >= 50
                                    ? 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-500/10 dark:to-yellow-500/20 border border-amber-100 dark:border-amber-500/20'
                                    : 'bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-500/10 dark:to-rose-500/20 border border-red-100 dark:border-red-500/20'
                                }`}>
                                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${result.nota >= 70 ? 'bg-emerald-500' : result.nota >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}>
                                    {result.nota >= 70 ? <Award className="w-10 h-10 text-white" />
                                        : result.nota >= 50 ? <Target className="w-10 h-10 text-white" />
                                            : <RotateCcw className="w-10 h-10 text-white" />}
                                </div>

                                <h3 className="text-4xl font-bold text-[var(--color-text-primary)]">{result.nota}%</h3>
                                <p className={`text-lg font-medium mt-2 ${result.nota >= 70
                                    ? 'text-emerald-600 dark:text-emerald-400'
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

                            <div>
                                <h4 className="font-bold text-[var(--color-text-primary)] mb-4">Revisão das respostas</h4>
                                <div className="space-y-3">
                                    {result.questoes.map((q, idx) => {
                                        const opcoes = q.opcoes || exercise.questoes[idx]?.opcoes || [];
                                        const suaLabel = typeof q.suaResposta === 'number' ? opcoes[q.suaResposta] : q.suaResposta;
                                        const corretaLabel = typeof q.respostaCorreta === 'number' ? opcoes[q.respostaCorreta] : q.respostaCorreta;
                                        return (
                                            <div
                                                key={idx}
                                                className={`p-4 rounded-xl border-2 ${q.correto
                                                    ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'
                                                    : 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${q.correto ? 'bg-emerald-500' : 'bg-red-500'
                                                        }`}>
                                                        {q.correto ? <Check className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-[var(--color-text-primary)] text-sm">
                                                            Questão {idx + 1}: {q.pergunta}
                                                        </p>
                                                        {!q.correto && (
                                                            <div className="text-sm mt-1.5 space-y-0.5">
                                                                <p className="text-[var(--color-text-secondary)]">
                                                                    Sua resposta:{' '}
                                                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                                                        {suaLabel || 'Não respondida'}
                                                                    </span>
                                                                </p>
                                                                <p className="text-[var(--color-text-secondary)]">
                                                                    Correta:{' '}
                                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                                        {corretaLabel}
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        )}
                                                        <Explicacao comentario={q.respostaComentada} fonte={q.fonteBibliografica} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ---- Questão ---- */
                        <div className="p-4 sm:p-6">
                            {/* Paleta de questões */}
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                {exercise.questoes.map((_, idx) => {
                                    const chk = checks[idx];
                                    const respondida = answers[idx] !== null;
                                    const atual = currentQuestionIndex === idx;
                                    let classes = 'bg-gray-100 dark:bg-white/5 text-[var(--color-text-muted)] hover:bg-gray-200 dark:hover:bg-white/10';
                                    if (atual) {
                                        classes = 'bg-primary-500 text-white shadow-md ring-2 ring-primary-500/30';
                                    } else if (chk) {
                                        classes = chk.correto
                                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-300 dark:border-emerald-500/40'
                                            : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-2 border-red-300 dark:border-red-500/40';
                                    } else if (respondida) {
                                        classes = 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border-2 border-primary-300 dark:border-primary-500/30';
                                    }
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => goToQuestion(idx)}
                                            className={`w-10 h-10 rounded-lg font-medium text-sm transition-all flex-shrink-0 ${classes}`}
                                            aria-label={`Ir para a questão ${idx + 1}`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            {questaoAtual && (
                                <div>
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-primary-500 uppercase tracking-wide">
                                                Questão {currentQuestionIndex + 1}
                                            </span>
                                            {mode === 'estudo' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded">
                                                    <Activity className="w-3 h-3" /> estudo
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mt-2">
                                            {questaoAtual.pergunta}
                                        </h3>

                                        {questaoAtual.imagem && (
                                            <div className="mt-4 rounded-xl overflow-hidden shadow-sm border border-[var(--glass-border)]">
                                                <img
                                                    src={questaoAtual.imagem}
                                                    alt={`Imagem da questão ${currentQuestionIndex + 1}`}
                                                    className="w-full max-h-[300px] object-contain bg-gray-50 dark:bg-black/20"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Alternativas */}
                                    <div className="space-y-3">
                                        {questaoAtual.opcoes?.map((opcao, optIdx) => {
                                            const selecionada = answers[currentQuestionIndex] === optIdx;
                                            const eCorreta = checkAtual && Number(checkAtual.respostaCorreta) === optIdx;
                                            const eErradaEscolhida = checkAtual && selecionada && !checkAtual.correto;

                                            let box = 'border-gray-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-500/50 hover:bg-gray-50 dark:hover:bg-white/5';
                                            let bolha = 'border-gray-300 dark:border-white/20 text-[var(--color-text-muted)]';
                                            if (eCorreta) {
                                                box = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
                                                bolha = 'border-emerald-500 bg-emerald-500 text-white';
                                            } else if (eErradaEscolhida) {
                                                box = 'border-red-500 bg-red-50 dark:bg-red-500/10';
                                                bolha = 'border-red-500 bg-red-500 text-white';
                                            } else if (selecionada) {
                                                box = 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300';
                                                bolha = 'border-primary-500 bg-primary-500 text-white';
                                            }

                                            return (
                                                <button
                                                    key={optIdx}
                                                    onClick={() => selectAnswer(optIdx)}
                                                    disabled={travada || checking}
                                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${box} ${travada ? 'cursor-default' : ''}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium text-sm flex-shrink-0 ${bolha}`}>
                                                            {letra(optIdx)}
                                                        </div>
                                                        <span className="flex-1">{opcao}</span>
                                                        {eCorreta && <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                                                        {eErradaEscolhida && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                                                        {!checkAtual && selecionada && <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Feedback imediato (modo estudo) */}
                                    {checkAtual && (
                                        <div className={`mt-5 p-4 rounded-xl border animate-slide-down ${checkAtual.correto
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                                            : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                                            }`}>
                                            <p className={`flex items-start gap-2 font-semibold text-sm ${checkAtual.correto
                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                : 'text-red-700 dark:text-red-400'
                                                }`}>
                                                {checkAtual.correto
                                                    ? <><Check className="w-4 h-4 flex-shrink-0 mt-0.5" /> Resposta correta!</>
                                                    : <><XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> Resposta incorreta — a correta é a alternativa {letra(Number(checkAtual.respostaCorreta))}</>}
                                            </p>
                                            <Explicacao
                                                comentario={checkAtual.respostaComentada}
                                                fonte={checkAtual.fonteBibliografica}
                                            />
                                            {!checkAtual.respostaComentada && (
                                                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                                    Esta questão não possui comentário cadastrado.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {checking && (
                                        <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                                            <Activity className="w-4 h-4 animate-pulse text-primary-500" /> Corrigindo…
                                        </p>
                                    )}
                                </div>
                            )}

                            {showConfirmSubmit && (
                                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-800 dark:text-amber-400">
                                            Você tem {answers.filter(a => a === null).length} questão(ões) não respondida(s).
                                        </p>
                                        <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
                                            Toque em Finalizar novamente para enviar mesmo assim.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-[var(--glass-border)] bg-gray-50 dark:bg-white/5 p-4 flex items-center justify-between gap-3 flex-shrink-0 safe-area-bottom">
                    {showStartScreen ? (
                        <button onClick={() => setShowStartScreen(false)} className="btn btn-primary w-full">
                            Começar {mode === 'estudo' ? 'no Modo Estudo' : 'no Modo Prova'}
                        </button>
                    ) : result ? (
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                            {onRestart && (
                                <button
                                    onClick={onRestart}
                                    className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" /> Refazer
                                </button>
                            )}
                            <button onClick={() => onClose(true)} className="btn btn-primary flex-1">
                                Fechar e Voltar
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => goToQuestion(currentQuestionIndex - 1)}
                                disabled={currentQuestionIndex === 0}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Anterior</span>
                            </button>

                            <span className="text-xs text-[var(--color-text-muted)] hidden md:inline">
                                {currentQuestionIndex + 1} / {totalQuestions}
                            </span>

                            {currentQuestionIndex < totalQuestions - 1 ? (
                                <button
                                    onClick={() => goToQuestion(currentQuestionIndex + 1)}
                                    className="flex items-center gap-2 px-5 sm:px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                                >
                                    Próxima
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={submitExercise}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-5 sm:px-6 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                >
                                    {isSubmitting ? 'Enviando...' : 'Finalizar'}
                                    <Check className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExercisePlayer;

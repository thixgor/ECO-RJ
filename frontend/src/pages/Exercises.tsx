import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Search,
    Filter,
    CheckCircle,
    Clock,
    ChevronRight,
    ChevronLeft,
    BookOpen,
    X,
    Award,
    Target,
    RotateCcw,
    AlertTriangle,
    Check,
    XCircle,
    Download
} from 'lucide-react';
import { exerciseService } from '../services/api';
import { Exercise, Lesson } from '../types';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { generateExercisePDF } from '../utils/pdfGenerator';

// Tipo para resultado
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

const Exercises: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const { id: urlExerciseId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Estado do modal de responder exercício
    const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(number | string | null)[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<ExerciseResult | null>(null);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

    useEffect(() => {
        loadExercises();
    }, []);

    // Verifica URL para abrir exercício automaticamente
    useEffect(() => {
        if (urlExerciseId && !isLoading && exercises.length > 0 && !activeExercise) {
            const target = exercises.find(e => e._id === urlExerciseId);
            if (target) {
                startExercise(target);
            }
        }
    }, [urlExerciseId, isLoading, exercises]);

    const loadExercises = async () => {
        try {
            setIsLoading(true);
            const response = await exerciseService.getAll();
            setExercises(response.data.exercises || []);
        } catch (error) {
            console.error('Erro ao carregar exercícios:', error);
            toast.error('Não foi possível carregar seus exercícios');
        } finally {
            setIsLoading(false);
        }
    };

    // Verifica se o usuário já respondeu o exercício
    const hasAnswered = (exerciseId: string) => {
        return user?.exerciciosRespondidos?.some((id: any) =>
            typeof id === 'string' ? id === exerciseId : id._id === exerciseId
        );
    };

    // Abre o modal para responder exercício
    const startExercise = async (exercise: Exercise) => {
        try {
            // Busca versão atualizada sem respostas
            const response = await exerciseService.getById(exercise._id);
            const fullExercise = response.data;

            setActiveExercise(fullExercise);
            setCurrentQuestionIndex(0);
            setAnswers(new Array(fullExercise.questoes.length).fill(null));
            setResult(null);
            setShowConfirmSubmit(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao carregar exercício');
            if (urlExerciseId) navigate('/exercicios');
        }
    };

    // Fecha o modal
    const closeExercise = () => {
        const handleClose = () => {
            setActiveExercise(null);
            setResult(null);
            if (urlExerciseId) {
                navigate('/exercicios');
            }
        };

        if (result) {
            handleClose();
            loadExercises();
            refreshUser?.();
        } else if (answers.some(a => a !== null)) {
            if (confirm('Tem certeza que deseja sair? Suas respostas serão perdidas.')) {
                handleClose();
            }
        } else {
            handleClose();
        }
    };

    // Seleciona resposta
    const selectAnswer = (questionIndex: number, answer: number | string) => {
        const newAnswers = [...answers];
        newAnswers[questionIndex] = answer;
        setAnswers(newAnswers);
    };

    // Navega entre questões
    const goToQuestion = (index: number) => {
        if (index >= 0 && index < (activeExercise?.questoes.length || 0)) {
            setCurrentQuestionIndex(index);
        }
    };

    // Envia respostas
    const submitExercise = async () => {
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
    };

    // Baixar PDF
    const downloadPDF = generateExercisePDF;

    // Filtro de exercícios
    const filteredExercises = exercises.filter(ex => {
        const aula = ex.aulaId as Lesson;
        const matchesSearch = ex.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (aula?.titulo && aula.titulo.toLowerCase().includes(searchTerm.toLowerCase()));

        if (filter === 'completed') {
            return matchesSearch && hasAnswered(ex._id);
        } else if (filter === 'pending') {
            return matchesSearch && !hasAnswered(ex._id);
        }
        return matchesSearch;
    });

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Concluído';
            case 'pending': return 'Pendente';
            default: return 'Todos';
        }
    };

    // Calcula progresso
    const answeredCount = answers.filter(a => a !== null).length;
    const totalQuestions = activeExercise?.questoes.length || 0;
    const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    if (isLoading) return <div className="p-12"><Loading /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Exercícios</h1>
                    <p className="text-[var(--color-text-muted)] mt-1">Realize suas atividades avaliativas</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-white/5 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <ClipboardList className="w-4 h-4 text-primary-500" />
                            <span>Total: <strong className="text-[var(--color-text-primary)]">{exercises.length}</strong></span>
                        </div>
                        <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Concluídos: <strong className="text-[var(--color-text-primary)]">{exercises.filter(e => hasAnswered(e._id)).length}</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        placeholder="Buscar por título ou aula..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-[var(--color-text-muted)]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <Filter className="w-5 h-5 text-[var(--color-text-muted)] hidden md:block" />
                    <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-lg">
                        {(['all', 'pending', 'completed'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f
                                    ? 'bg-white dark:bg-primary-500 text-primary-600 dark:text-white shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                    }`}
                            >
                                {getStatusLabel(f)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Exercises Grid */}
            {filteredExercises.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredExercises.map((exercise) => {
                        const aula = exercise.aulaId as Lesson;
                        const completed = hasAnswered(exercise._id);
                        const isUnlimited = exercise.tentativasPermitidas >= 999999;

                        return (
                            <div
                                key={exercise._id}
                                className={`group bg-white dark:bg-white/5 rounded-xl shadow-sm border transition-all duration-300 overflow-hidden flex flex-col ${completed
                                    ? 'border-green-200 dark:border-green-500/30 bg-green-50/30 dark:bg-green-500/5'
                                    : 'border-gray-200 dark:border-white/10 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-500/50'
                                    }`}
                            >
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${completed
                                            ? 'text-green-600 bg-green-100 border-green-200'
                                            : 'text-amber-600 bg-amber-100 border-amber-200'
                                            }`}>
                                            {completed ? 'Concluído' : 'Disponível'}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => downloadPDF(exercise)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                title="Baixar PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded flex items-center">
                                                {exercise.questoes.length} Questões
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="font-heading font-semibold text-lg text-[var(--color-text-primary)] group-hover:text-primary-600 transition-colors mb-2 line-clamp-2">
                                        {exercise.titulo}
                                    </h3>

                                    {aula?.titulo && (
                                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-4">
                                            <BookOpen className="w-4 h-4 text-primary-500" />
                                            <span className="truncate">{aula.titulo}</span>
                                        </div>
                                    )}

                                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
                                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                                            <Clock className="w-4 h-4 text-primary-500" />
                                            <span>
                                                {isUnlimited ? 'Tentativas ilimitadas' : `${exercise.tentativasPermitidas} tentativa(s) permitida(s)`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/10 flex justify-end">
                                    <button
                                        onClick={() => startExercise(exercise)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${completed
                                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            : 'bg-primary-500 text-white hover:bg-primary-600'
                                            }`}
                                    >
                                        {completed ? 'Refazer' : 'Iniciar Exercício'}
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 border-dashed">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="w-8 h-8 text-[var(--color-text-muted)]" />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Nenhum exercício encontrado</h3>
                    <p className="text-[var(--color-text-muted)] mt-1">Nenhum exercício disponível para você no momento.</p>
                </div>
            )}

            {/* Modal de Responder Exercício */}
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

export default Exercises;

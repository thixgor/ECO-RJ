import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Search,
    CheckCircle,
    ChevronRight,
    BookOpen,
    Download,
    Brain,
    GraduationCap,
    Lightbulb,
    Repeat,
    ListChecks,
    Percent
} from 'lucide-react';
import { exerciseService } from '../services/api';
import { Exercise, Lesson } from '../types';
import Loading from '../components/common/Loading';
import ExercisePlayer, { MODE_STORAGE_KEY, type ExerciseMode } from '../components/exercises/ExercisePlayer';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { generateExercisePDF } from '../utils/pdfGenerator';

/** Tentativas e melhor nota do usuário em um exercício. */
interface ExerciseProgress {
    tentativas: number;
    melhorNota: number;
    ultimaData: string;
}

const Exercises: React.FC = () => {
    const { refreshUser } = useAuth();
    const { id: urlExerciseId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [progresso, setProgresso] = useState<Record<string, ExerciseProgress>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // ---- Sessão de resolução ----
    /** Exercício aberto no player (já carregado, sem gabarito). */
    const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
    /** Trocar a key remonta o player — é assim que o botão "Refazer" reinicia. */
    const [playerKey, setPlayerKey] = useState(0);
    /** Modo padrão exibido ao abrir um exercício (persistido entre sessões). */
    const [mode, setMode] = useState<ExerciseMode>(() =>
        localStorage.getItem(MODE_STORAGE_KEY) === 'prova' ? 'prova' : 'estudo'
    );

    useEffect(() => {
        loadExercises();
    }, []);

    useEffect(() => {
        localStorage.setItem(MODE_STORAGE_KEY, mode);
    }, [mode]);

    // Abre o exercício automaticamente quando a URL traz um id
    useEffect(() => {
        if (urlExerciseId && !isLoading && exercises.length > 0 && !activeExercise) {
            const target = exercises.find(e => e._id === urlExerciseId);
            if (target) startExercise(target);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlExerciseId, isLoading, exercises]);

    const loadExercises = async () => {
        try {
            setIsLoading(true);
            const [listRes, progressRes] = await Promise.all([
                exerciseService.getAll(),
                // O progresso vem do histórico de respostas, não do cache do usuário.
                exerciseService.getMyProgress().catch(() => ({ data: { progresso: {} } }))
            ]);
            setExercises(listRes.data.exercises || []);
            setProgresso(progressRes.data.progresso || {});
        } catch (error) {
            console.error('Erro ao carregar exercícios:', error);
            toast.error('Não foi possível carregar seus exercícios');
        } finally {
            setIsLoading(false);
        }
    };

    const hasAnswered = (exerciseId: string) => !!progresso[exerciseId];

    /** Carrega o exercício sem gabarito e abre o player. */
    const startExercise = async (exercise: Exercise) => {
        try {
            const response = await exerciseService.getById(exercise._id);
            setActiveExercise(response.data);
            setPlayerKey((k) => k + 1);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao carregar exercício');
            if (urlExerciseId) navigate('/exercicios');
        }
    };

    // ---- Listagem ----

    const filteredExercises = useMemo(() => exercises.filter(ex => {
        const aula = ex.aulaId as Lesson;
        const termo = searchTerm.toLowerCase();
        const matchesSearch = ex.titulo.toLowerCase().includes(termo) ||
            (aula?.titulo && aula.titulo.toLowerCase().includes(termo));

        if (filter === 'completed') return matchesSearch && hasAnswered(ex._id);
        if (filter === 'pending') return matchesSearch && !hasAnswered(ex._id);
        return matchesSearch;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [exercises, searchTerm, filter, progresso]);

    const concluidos = exercises.filter(e => hasAnswered(e._id)).length;
    const notas = Object.values(progresso).map(p => p.melhorNota);
    const mediaNotas = notas.length
        ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length)
        : null;

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Concluídos';
            case 'pending': return 'Pendentes';
            default: return 'Todos';
        }
    };

    if (isLoading) return <div className="p-12"><Loading /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Exercícios</h1>
                    <p className="text-[var(--color-text-muted)] mt-1">
                        Treine com correção comentada questão por questão
                    </p>
                </div>
                <button
                    onClick={() => setMode(mode === 'estudo' ? 'prova' : 'estudo')}
                    className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-primary-400 transition-colors"
                    title="Modo padrão ao iniciar um exercício"
                >
                    {mode === 'estudo'
                        ? <><Brain className="w-4 h-4 text-primary-500" /> Modo Estudo</>
                        : <><GraduationCap className="w-4 h-4 text-amber-500" /> Modo Prova</>}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { icon: <ClipboardList className="w-4 h-4" />, label: 'Exercícios', valor: exercises.length, cor: 'text-primary-500' },
                    { icon: <CheckCircle className="w-4 h-4" />, label: 'Concluídos', valor: concluidos, cor: 'text-emerald-500' },
                    { icon: <ListChecks className="w-4 h-4" />, label: 'Pendentes', valor: exercises.length - concluidos, cor: 'text-amber-500' },
                    { icon: <Percent className="w-4 h-4" />, label: 'Melhor média', valor: mediaNotas === null ? '—' : `${mediaNotas}%`, cor: 'text-purple-500' }
                ].map((s) => (
                    <div key={s.label} className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                        <div className={`flex items-center gap-2 text-xs font-medium ${s.cor}`}>
                            {s.icon}
                            <span className="text-[var(--color-text-muted)]">{s.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{s.valor}</p>
                    </div>
                ))}
            </div>

            {/* Filtros e busca */}
            <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 flex flex-col md:flex-row gap-4 justify-between md:items-center">
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

                <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-lg self-start md:self-auto">
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

            {/* Grid de exercícios */}
            {filteredExercises.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredExercises.map((exercise) => {
                        const aula = exercise.aulaId as Lesson;
                        const prog = progresso[exercise._id];
                        const completed = !!prog;
                        const isUnlimited = exercise.tentativasPermitidas >= 999999;
                        const comGabarito = exercise.mostrarRespostas !== false;
                        const semTentativas = !isUnlimited && !!prog && prog.tentativas >= exercise.tentativasPermitidas;

                        return (
                            <div
                                key={exercise._id}
                                className={`group bg-white dark:bg-white/5 rounded-xl shadow-sm border transition-all duration-300 overflow-hidden flex flex-col ${completed
                                    ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5'
                                    : 'border-gray-200 dark:border-white/10 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-500/50'
                                    }`}
                            >
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start gap-2 mb-4">
                                        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${completed
                                            ? 'text-emerald-600 bg-emerald-100 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30'
                                            : 'text-amber-600 bg-amber-100 border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30'
                                            }`}>
                                            {completed ? `Concluído · ${prog.melhorNota}%` : 'Disponível'}
                                        </div>
                                        <button
                                            onClick={() => generateExercisePDF(exercise)}
                                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-primary-600 hover:bg-primary-500/10 transition-colors"
                                            title="Baixar PDF"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <h3 className="font-heading font-semibold text-lg text-[var(--color-text-primary)] group-hover:text-primary-600 transition-colors mb-2 line-clamp-2">
                                        {exercise.titulo}
                                    </h3>

                                    {aula?.titulo && (
                                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-4">
                                            <BookOpen className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                            <span className="truncate">{aula.titulo}</span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/10 text-xs">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-[var(--color-text-secondary)]">
                                            <ListChecks className="w-3.5 h-3.5 text-primary-500" />
                                            {exercise.questoes.length} questões
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${semTentativas
                                            ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                                            : 'bg-gray-100 dark:bg-white/5 text-[var(--color-text-secondary)]'
                                            }`}>
                                            <Repeat className="w-3.5 h-3.5" />
                                            {isUnlimited
                                                ? 'Tentativas ilimitadas'
                                                : `${prog?.tentativas || 0}/${exercise.tentativasPermitidas} tentativas`}
                                        </span>
                                        {comGabarito ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                                <Lightbulb className="w-3.5 h-3.5" />
                                                Gabarito na hora
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                                <GraduationCap className="w-3.5 h-3.5" />
                                                Só no final
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/10 flex justify-end">
                                    <button
                                        onClick={() => startExercise(exercise)}
                                        disabled={semTentativas}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${completed
                                            ? 'bg-gray-200 dark:bg-white/10 text-[var(--color-text-primary)] hover:bg-gray-300 dark:hover:bg-white/20'
                                            : 'bg-primary-500 text-white hover:bg-primary-600'
                                            }`}
                                        title={semTentativas ? 'Você já usou todas as tentativas permitidas' : undefined}
                                    >
                                        {semTentativas ? 'Sem tentativas' : completed ? 'Refazer' : 'Iniciar Exercício'}
                                        {!semTentativas && <ChevronRight className="w-4 h-4" />}
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

            {/* Player de resolução (compartilhado com a página da aula) */}
            {activeExercise && (
                <ExercisePlayer
                    key={playerKey}
                    exercise={activeExercise}
                    onClose={(enviado) => {
                        setActiveExercise(null);
                        if (urlExerciseId) navigate('/exercicios');
                        if (enviado) {
                            loadExercises();
                            refreshUser?.();
                        }
                    }}
                    onRestart={() => setPlayerKey((k) => k + 1)}
                />
            )}
        </div>
    );
};

export default Exercises;

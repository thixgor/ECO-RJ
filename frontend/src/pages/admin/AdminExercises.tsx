import React, { useState, useEffect } from 'react';
import {
    ClipboardList,
    Plus,
    Search,
    Edit,
    Trash2,
    Clock,
    BookOpen,
    X,
    PlusCircle,
    Upload
} from 'lucide-react';
import { exerciseService, lessonService } from '../../services/api';
import { Exercise, Lesson, Question } from '../../types';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const AdminExercises: React.FC = () => {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        titulo: '',
        aulaId: '',
        tipo: 'multipla_escolha' as Exercise['tipo'],
        questoes: [] as Question[],
        cargosPermitidos: ['Aluno', 'Instrutor', 'Administrador'],
        tentativasPermitidas: 1
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [exercisesRes, lessonsRes] = await Promise.all([
                exerciseService.getAll(),
                lessonService.getAll()
            ]);
            setExercises(exercisesRes.data.exercises || []);
            setLessons(lessonsRes.data.lessons || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast.error('Erro ao carregar lista de exercícios');
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (exercise?: Exercise) => {
        if (exercise) {
            setEditingExercise(exercise);
            setFormData({
                titulo: exercise.titulo,
                aulaId: typeof exercise.aulaId === 'string' ? exercise.aulaId : exercise.aulaId?._id || '',
                tipo: exercise.tipo,
                questoes: [...exercise.questoes],
                cargosPermitidos: exercise.cargosPermitidos,
                tentativasPermitidas: exercise.tentativasPermitidas
            });
        } else {
            setEditingExercise(null);
            setFormData({
                titulo: '',
                aulaId: '', // Agora pode ser vazio - anexar aula é opcional
                tipo: 'multipla_escolha',
                questoes: [{ pergunta: '', opcoes: ['', '', '', ''], respostaCorreta: 0, pontos: 10 }],
                cargosPermitidos: ['Aluno', 'Instrutor', 'Administrador'],
                tentativasPermitidas: 1
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.questoes.length === 0) {
            toast.error('Adicione pelo menos uma questão');
            return;
        }

        setIsSaving(true);
        try {
            // Preparar dados - remover aulaId se estiver vazio
            const dataToSend: any = {
                titulo: formData.titulo,
                tipo: formData.tipo,
                questoes: formData.questoes,
                cargosPermitidos: formData.cargosPermitidos,
                tentativasPermitidas: formData.tentativasPermitidas
            };

            // Só incluir aulaId se tiver valor
            if (formData.aulaId && formData.aulaId.trim() !== '') {
                dataToSend.aulaId = formData.aulaId;
            }

            if (editingExercise) {
                await exerciseService.update(editingExercise._id, dataToSend);
                toast.success('Exercício atualizado com sucesso!');
            } else {
                await exerciseService.create(dataToSend);
                toast.success('Exercício criado com sucesso!');
            }
            setShowModal(false);
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao salvar exercício');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja deletar este exercício?')) return;
        try {
            await exerciseService.delete(id);
            toast.success('Exercício removido');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao deletar');
        }
    };

    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');

    // Função para processar o texto importado
    const handleImport = () => {
        try {
            const blocks = importText.split(/--QUESTAO\d*/).filter(b => b.trim().length > 0);
            const newQuestions: any[] = [];

            blocks.forEach((block) => {
                const lines = block.split('\n').filter(l => l.trim());
                if (lines.length === 0) return;

                const question: any = {
                    pergunta: '',
                    opcoes: [],
                    respostaCorreta: 0,
                    pontos: 1,
                    respostaComentada: '',
                    fonteBibliografica: ''
                };

                const opcoesMap: { [key: number]: string } = {};

                lines.forEach(line => {
                    const cleanLine = line.trim();

                    // Helper para extrair conteúdo entre aspas e após dois pontos
                    const extractContent = (prefix: string) => {
                        let content = cleanLine.substring(prefix.length).trim();
                        // Remove aspas iniciais e finais se existirem
                        if (content.startsWith('"') && content.endsWith('"')) {
                            content = content.substring(1, content.length - 1);
                        }
                        return content;
                    };

                    if (cleanLine.startsWith('ENUNCIADO:')) {
                        question.pergunta = extractContent('ENUNCIADO:');
                    } else if (cleanLine.startsWith('RESPOSTA-COMENTADA:')) {
                        question.respostaComentada = extractContent('RESPOSTA-COMENTADA:');
                    } else if (cleanLine.startsWith('FONTE-BIBLIOGRAFICA:')) {
                        question.fonteBibliografica = extractContent('FONTE-BIBLIOGRAFICA:');
                    } else if (cleanLine.startsWith('OPCAO-CORRETA:')) {
                        const val = extractContent('OPCAO-CORRETA:');
                        // Tenta extrair apenas o primeiro número se houver uma lista '1,2,3' (assumindo apenas uma correta para multipla escolha simples)
                        // Se for string "1,2,3,4" e o sistema espera int, pegamos o primeiro.
                        const numbers = val.match(/\d+/);
                        if (numbers) {
                            question.respostaCorreta = parseInt(numbers[0]) - 1;
                        }
                    } else if (cleanLine.match(/^OPCAO\d+:/)) {
                        const match = cleanLine.match(/^OPCAO(\d+):/);
                        if (match) {
                            const index = parseInt(match[1]);
                            const content = extractContent(match[0]);
                            opcoesMap[index] = content;
                        }
                    }
                });

                // Converter mapa de opções para array ordenado
                const sortedIndices = Object.keys(opcoesMap).map(Number).sort((a, b) => a - b);
                question.opcoes = sortedIndices.map(i => opcoesMap[i]);

                // Validação básica
                if (question.pergunta && question.opcoes.length >= 2) {
                    newQuestions.push(question);
                }
            });

            if (newQuestions.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    questoes: [...prev.questoes, ...newQuestions],
                    tipo: 'multipla_escolha' // Força múltipla escolha ao importar
                }));
                toast.success(`${newQuestions.length} questões importadas com sucesso!`);
                setShowImportModal(false);
                setImportText('');
            } else {
                toast.error('Nenhuma questão válida encontrada. Verifique o padrão.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao processar. Verifique o formato.');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
            toast.error('Apenas arquivos .txt são permitidos');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setImportText(content);
        };
        reader.readAsText(file);
    };

    const addQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questoes: [...prev.questoes, { pergunta: '', opcoes: ['', '', '', ''], respostaCorreta: 0, pontos: 10 }]
        }));
    };

    const removeQuestion = (index: number) => {
        setFormData(prev => ({
            ...prev,
            questoes: prev.questoes.filter((_, i) => i !== index)
        }));
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQuestions = [...formData.questoes];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setFormData({ ...formData, questoes: newQuestions });
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...formData.questoes];
        const newOptions = [...(newQuestions[qIndex].opcoes || [])];
        newOptions[oIndex] = value;
        newQuestions[qIndex] = { ...newQuestions[qIndex], opcoes: newOptions };
        setFormData({ ...formData, questoes: newQuestions });
    };

    const toggleCargo = (cargo: string) => {
        setFormData(prev => ({
            ...prev,
            cargosPermitidos: prev.cargosPermitidos.includes(cargo)
                ? prev.cargosPermitidos.filter(c => c !== cargo)
                : [...prev.cargosPermitidos, cargo]
        }));
    };

    const filteredExercises = exercises.filter(ex =>
        ex.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof ex.aulaId !== 'string' && ex.aulaId?.titulo.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Gerenciar Exercícios</h1>
                    <p className="text-[var(--color-text-secondary)]">Total de {exercises.length} exercícios no sistema</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Novo Exercício
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-white/10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por título ou aula..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
                {isLoading ? (
                    <div className="p-12">
                        <Loading />
                    </div>
                ) : filteredExercises.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredExercises.map((exercise) => {
                            const aula = exercise.aulaId as Lesson;
                            return (
                                <div key={exercise._id} className="p-6 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <ClipboardList className="w-6 h-6 text-primary-600" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-medium text-[var(--color-text-primary)] text-lg">{exercise.titulo}</h3>
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-white/10 text-[var(--color-text-muted)]">
                                                {exercise.questoes.length} questões
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                                            <div className="flex items-center gap-1">
                                                <BookOpen className="w-4 h-4" />
                                                {aula?.titulo || 'Aula não vinculada'}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                Max {exercise.tentativasPermitidas} tentativa(s)
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                                        <button
                                            onClick={() => openModal(exercise)}
                                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(exercise._id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardList className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Nenhum exercício cadastrado</h3>
                        <p className="text-gray-500 mt-1">Clique em "Novo Exercício" para criar seu primeiro exercício.</p>
                        <p className="text-xs text-gray-400 mt-2">Você pode anexar o exercício a uma aula depois, se desejar.</p>
                    </div>
                )}
            </div>

            {/* CRUD Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="modal-content !max-w-4xl !my-8 !flex !flex-col !max-h-[90vh] p-0 overflow-hidden">
                        <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
                                {editingExercise ? <Edit className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                                {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Título do Exercício *</label>
                                    <input
                                        type="text"
                                        value={formData.titulo}
                                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                        className="input"
                                        required
                                        placeholder="Ex: Quiz de Fundamentos de Economia"
                                    />
                                </div>
                                <div>
                                    <label className="label">Aula Vinculada (Opcional)</label>
                                    <select
                                        value={formData.aulaId}
                                        onChange={(e) => setFormData({ ...formData, aulaId: e.target.value })}
                                        className="input"
                                    >
                                        <option value="">Nenhuma (anexar depois)</option>
                                        {lessons.map(lesson => (
                                            <option key={lesson._id} value={lesson._id}>{lesson.titulo}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                        Você pode anexar este exercício a uma aula posteriormente
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Tipo de Questão Padrão</label>
                                    <select
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as Exercise['tipo'] })}
                                        className="input"
                                    >
                                        <option value="multipla_escolha">Múltipla Escolha</option>
                                        <option value="verdadeiro_falso">Verdadeiro ou Falso</option>
                                        <option value="dissertativo">Dissertativo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Tentativas Permitidas</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={formData.tentativasPermitidas >= 999999 ? 1 : formData.tentativasPermitidas}
                                            onChange={(e) => setFormData({ ...formData, tentativasPermitidas: parseInt(e.target.value) })}
                                            className="input w-24"
                                            disabled={formData.tentativasPermitidas >= 999999}
                                        />
                                        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={formData.tentativasPermitidas >= 999999}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    tentativasPermitidas: e.target.checked ? 999999 : 3
                                                })}
                                                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                            />
                                            Ilimitadas
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="label">Cargos com Acesso</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Visitante', 'Aluno', 'Instrutor', 'Administrador'].map(cargo => (
                                        <button
                                            key={cargo}
                                            type="button"
                                            onClick={() => toggleCargo(cargo)}
                                            className={`px-3 py-1 rounded-full text-sm border transition-colors ${formData.cargosPermitidos.includes(cargo)
                                                ? 'bg-primary-500 text-white border-primary-500'
                                                : 'bg-white dark:bg-white/5 text-[var(--color-text-muted)] border-gray-300 dark:border-white/10 hover:border-primary-300'
                                                }`}
                                        >
                                            {cargo}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Questions Section */}
                            <div className="pt-4 border-t border-[var(--glass-border)]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg text-[var(--color-text-primary)]">Questões</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowImportModal(true)}
                                            className="btn btn-outline py-1 px-3 text-sm flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50/50 hover:border-blue-300 transition-all"
                                            title="Importar questões em massa"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Importar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addQuestion}
                                            className="btn btn-outline py-1 px-3 text-sm flex items-center gap-1"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Adicionar Questão
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {formData.questoes.map((q, qIndex) => (
                                        <div key={qIndex} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 relative group/q">
                                            <button
                                                type="button"
                                                onClick={() => removeQuestion(qIndex)}
                                                className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                            <div className="grid gap-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Pergunta {qIndex + 1}</label>
                                                    <textarea
                                                        value={q.pergunta}
                                                        onChange={(e) => updateQuestion(qIndex, 'pergunta', e.target.value)}
                                                        className="input mt-1 min-h-[60px]"
                                                        placeholder="Digite o enunciado da questão..."
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Imagem (URL Opcional)</label>
                                                    <input
                                                        type="text"
                                                        value={q.imagem || ''}
                                                        onChange={(e) => updateQuestion(qIndex, 'imagem', e.target.value)}
                                                        className="input mt-1"
                                                        placeholder="https://exemplo.com/imagem.jpg"
                                                    />
                                                    {q.imagem && (
                                                        <div className="mt-2 relative w-32 h-20 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden border border-[var(--glass-border)]">
                                                            <img src={q.imagem} alt="Preview" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4 bg-blue-50/50 dark:bg-blue-500/10 p-4 rounded-lg border border-blue-100 dark:border-blue-500/20">
                                                    <div>
                                                        <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Resposta Comentada (Opcional)</label>
                                                        <textarea
                                                            value={q.respostaComentada || ''}
                                                            onChange={(e) => updateQuestion(qIndex, 'respostaComentada', e.target.value)}
                                                            className="input mt-1 min-h-[80px] text-sm"
                                                            placeholder="Explique o porquê da resposta estar correta..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Fonte Bibliográfica (Opcional)</label>
                                                        <textarea
                                                            value={q.fonteBibliografica || ''}
                                                            onChange={(e) => updateQuestion(qIndex, 'fonteBibliografica', e.target.value)}
                                                            className="input mt-1 min-h-[80px] text-sm"
                                                            placeholder="Ex: Diretriz SBC 2024, Cap. 3, Pág. 45"
                                                        />
                                                    </div>
                                                </div>

                                                {formData.tipo !== 'dissertativo' && (
                                                    <div className="grid gap-2">
                                                        <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Opções e Resposta Correta</label>
                                                        {q.opcoes?.map((opt, oIndex) => (
                                                            <div key={oIndex} className="flex items-center gap-3">
                                                                <input
                                                                    type="radio"
                                                                    name={`correct-${qIndex}`}
                                                                    checked={q.respostaCorreta === oIndex}
                                                                    onChange={() => updateQuestion(qIndex, 'respostaCorreta', oIndex)}
                                                                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                                    className={`flex-1 input py-1.5 ${q.respostaCorreta === oIndex ? 'border-primary-300 bg-primary-50 dark:bg-primary-500/10' : ''}`}
                                                                    placeholder={`Opção ${oIndex + 1}`}
                                                                    required={formData.tipo === 'multipla_escolha' || oIndex < 2}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="w-32">
                                                    <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Pontos</label>
                                                    <input
                                                        type="number"
                                                        value={q.pontos}
                                                        onChange={(e) => updateQuestion(qIndex, 'pontos', parseInt(e.target.value))}
                                                        className="input py-1.5"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="btn btn-outline"
                                disabled={isSaving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="btn btn-primary min-w-[120px]"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Salvando...' : editingExercise ? 'Salvar Alterações' : 'Criar Exercício'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-900">Importar Questões</h3>
                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Cole o texto das questões no padrão abaixo ou envie um arquivo .txt:</p>
                                <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono text-gray-500 mb-4 border border-gray-200">
                                    --QUESTAO1<br />
                                    ENUNCIADO: "Texto da questão"<br />
                                    OPCAO1: "Opção A"<br />
                                    ...<br />
                                    OPCAO-CORRETA: "1"<br />
                                    RESPOSTA-COMENTADA: "..."<br />
                                    FONTE-BIBLIOGRAFICA: "..."
                                </div>

                                <div className="flex items-center gap-4 mb-4">
                                    <label className="btn btn-outline py-1.5 px-4 text-sm cursor-pointer border-dashed border-2 flex items-center">
                                        <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                                        <Upload className="w-4 h-4 mr-2" />
                                        Carregar arquivo .txt
                                    </label>
                                    <span className="text-xs text-gray-400">ou cole abaixo</span>
                                </div>

                                <textarea
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    className="w-full h-64 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                                    placeholder="Cole aqui o conteúdo..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="btn btn-outline"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!importText.trim()}
                                className="btn btn-primary"
                            >
                                Processar Importação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminExercises;

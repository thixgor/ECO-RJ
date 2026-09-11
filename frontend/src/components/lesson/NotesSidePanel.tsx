import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, StickyNote, Clock, Trash2, Edit3, Check, Loader2, Plus, Play } from 'lucide-react';
import { notesService } from '../../services/api';
import { UserNote } from '../../types';
import toast from 'react-hot-toast';

interface NotesSidePanelProps {
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  getCurrentTimestamp: () => number;
  onSeekToTimestamp: (timestamp: number) => void;
}

const formatTimestamp = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const NotesSidePanel: React.FC<NotesSidePanelProps> = ({
  lessonId,
  isOpen,
  onClose,
  getCurrentTimestamp,
  onSeekToTimestamp
}) => {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes on mount and when lessonId changes
  const loadNotes = useCallback(async () => {
    if (!lessonId) return;

    setIsLoading(true);
    try {
      const response = await notesService.getByLesson(lessonId);
      setNotes(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen, loadNotes]);

  // Auto-focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Save new note
  const handleSaveNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsSaving(true);
    try {
      const timestamp = getCurrentTimestamp();
      const response = await notesService.create({
        lessonId,
        conteudo: newNoteContent.trim(),
        timestamp: Math.floor(timestamp)
      });

      setNotes(prev => [...prev, response.data].sort((a, b) => a.timestamp - b.timestamp));
      setNewNoteContent('');
      toast.success('Nota salva!');
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      toast.error('Erro ao salvar nota');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Ctrl+Enter to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveNote();
    }
  };

  // Update note
  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      await notesService.update(noteId, editContent.trim());
      setNotes(prev =>
        prev.map(note =>
          note._id === noteId ? { ...note, conteudo: editContent.trim() } : note
        )
      );
      setEditingNoteId(null);
      setEditContent('');
      toast.success('Nota atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      toast.error('Erro ao atualizar nota');
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesService.delete(noteId);
      setNotes(prev => prev.filter(note => note._id !== noteId));
      toast.success('Nota excluída');
    } catch (error) {
      console.error('Erro ao excluir nota:', error);
      toast.error('Erro ao excluir nota');
    }
  };

  // Start editing
  const startEditing = (note: UserNote) => {
    setEditingNoteId(note._id);
    setEditContent(note.conteudo);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Side Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full z-50
          w-full sm:w-96
          bg-[var(--glass-bg)] backdrop-blur-xl
          border-l border-[var(--glass-border)]
          shadow-2xl
          transform transition-transform duration-300 ease-out
          flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <StickyNote className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--color-text-primary)]">
                Minhas Notas
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {notes.length} nota{notes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[var(--glass-bg)] flex items-center justify-center mx-auto mb-4">
                <StickyNote className="w-8 h-8 text-[var(--color-text-muted)]" />
              </div>
              <p className="text-[var(--color-text-muted)] text-sm">
                Nenhuma nota ainda.
              </p>
              <p className="text-[var(--color-text-muted)] text-xs mt-1">
                Comece escrevendo uma nota abaixo!
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note._id}
                className="p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--glass-border)] group"
              >
                {editingNoteId === note._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--color-text-primary)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateNote(note._id)}
                        className="px-3 py-1 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingNoteId(null);
                          setEditContent('');
                        }}
                        className="px-3 py-1 rounded-lg bg-gray-500/20 text-[var(--color-text-muted)] text-xs font-medium hover:bg-gray-500/30 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Timestamp button */}
                    <button
                      onClick={() => onSeekToTimestamp(note.timestamp)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-500/10 text-primary-500 text-xs font-medium hover:bg-primary-500/20 transition-colors mb-2"
                    >
                      <Play className="w-3 h-3" />
                      {formatTimestamp(note.timestamp)}
                    </button>

                    {/* Note content */}
                    <p className="text-[var(--color-text-primary)] text-sm whitespace-pre-wrap">
                      {note.conteudo}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--glass-border)]">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {new Date(note.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(note)}
                          className="p-1.5 rounded-lg hover:bg-[var(--glass-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note._id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* New Note Input */}
        <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-500/10 text-primary-500 text-xs font-medium">
              <Clock className="w-3 h-3" />
              <span>{formatTimestamp(getCurrentTimestamp())}</span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              Timestamp atual
            </span>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreva uma nota..."
              className="w-full p-3 pr-12 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
              rows={3}
            />
            <button
              onClick={handleSaveNote}
              disabled={!newNoteContent.trim() || isSaving}
              className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
              title="Salvar nota (Ctrl+Enter)"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] text-[var(--color-text-primary)]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] text-[var(--color-text-primary)]">Enter</kbd> para salvar
          </p>
        </div>
      </div>
    </>
  );
};

export default NotesSidePanel;

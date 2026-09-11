import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Texto da opção que habilita o campo de texto livre. Ex.: "Outro(a) — não listado(a)" */
  otherLabel?: string;
  /** Placeholder do campo livre ao escolher "Outro" */
  otherPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  id?: string;
}

/**
 * Combobox com busca. Ideal para listas longas (hospitais, instituições,
 * especialidades). Permite escolher uma opção da lista OU informar um valor
 * livre quando a opção "Outro(a)" está presente.
 */
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  otherLabel,
  otherPlaceholder = 'Digite aqui...',
  disabled = false,
  error = false,
  id
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Detecta se o valor atual é um valor livre (não está na lista)
  useEffect(() => {
    if (value && !options.includes(value)) {
      setCustomMode(true);
      setCustomValue(value);
    } else if (!value) {
      setCustomMode(false);
      setCustomValue('');
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter((opt) => normalize(opt).includes(q));
  }, [query, options]);

  const handleSelect = (opt: string) => {
    if (otherLabel && opt === otherLabel) {
      setCustomMode(true);
      setCustomValue('');
      onChange('');
      setOpen(false);
      setQuery('');
      return;
    }
    setCustomMode(false);
    onChange(opt);
    setOpen(false);
    setQuery('');
  };

  if (customMode) {
    return (
      <div className="relative">
        <input
          id={id}
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={otherPlaceholder}
          disabled={disabled}
          className={`input pr-10 ${error ? 'input-error' : ''}`}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false);
            setCustomValue('');
            onChange('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          title="Voltar para a lista"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`input flex items-center justify-between text-left ${error ? 'input-error' : ''} ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className={value ? 'text-[var(--color-text-primary)] truncate' : 'text-gray-400 truncate'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-[var(--glass-border)] rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col animate-slide-down">
          <div className="p-2 border-b border-[var(--glass-border)] sticky top-0 bg-white dark:bg-gray-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="input pl-8 py-2 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-[var(--color-text-muted)]">Nenhum resultado encontrado</p>
            )}
            {filtered.map((opt) => {
              const isOther = otherLabel && opt === otherLabel;
              return (
                <button
                  type="button"
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors ${
                    isOther ? 'text-primary-600 dark:text-primary-400 font-medium border-t border-[var(--glass-border)]' : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeSwitchProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm text-[var(--color-text-muted)]">
          {isDark ? 'Modo Escuro' : 'Modo Claro'}
        </span>
      )}

      <button
        onClick={toggleTheme}
        className={`theme-switch ${isDark ? 'dark' : ''}`}
        aria-label={`Mudar para modo ${isDark ? 'claro' : 'escuro'}`}
        title={`Mudar para modo ${isDark ? 'claro' : 'escuro'}`}
      >
        <div className="theme-switch-thumb flex items-center justify-center">
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-gray-600" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-600" />
          )}
        </div>
      </button>
    </div>
  );
};

export default ThemeSwitch;

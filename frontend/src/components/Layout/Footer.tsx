import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Logos ECO RJ
const LOGO_DARK = 'https://i.imgur.com/qBXnSUD.png';
const LOGO_LIGHT = 'https://i.imgur.com/B1SnAtD.png';

const Footer: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <footer className="bg-white dark:bg-black/40 border-t border-[var(--glass-border)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo e Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={isDark ? LOGO_DARK : LOGO_LIGHT}
                alt="ECO RJ"
                className="h-10 w-auto drop-shadow-lg select-none pointer-events-none"
                loading="lazy"
                decoding="async"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
              <span className="font-heading font-bold text-xl text-[var(--color-text-primary)]">ECO RJ</span>
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              Centro de Treinamento em Ecocardiografia. Atualize-se em ecocardiografia com integração de conceitos clínicos e de imagem.
            </p>
            <p className="text-[var(--color-text-muted)] text-xs">
              CNPJ: 21.847.609/0001-70
            </p>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4 text-[var(--color-text-primary)]">Contato</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-[var(--color-text-secondary)]">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary-500" />
                <p className="text-sm">
                  Avenida das Américas 19.019<br />
                  Recreio Shopping - Sala 336<br />
                  Recreio dos Bandeirantes - RJ
                </p>
              </div>
              <a
                href="mailto:contato@cursodeecocardiografia.com"
                className="flex items-center gap-3 text-[var(--color-text-secondary)] hover:text-primary-500 transition-colors"
              >
                <Mail className="w-5 h-5 text-primary-500" />
                <span className="text-sm">contato@cursodeecocardiografia.com</span>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4 text-[var(--color-text-primary)]">Links Úteis</h3>
            <div className="space-y-2">
              <Link to="/cursos" className="block text-[var(--color-text-secondary)] hover:text-primary-500 transition-colors text-sm">
                Nossos Cursos
              </Link>
              <Link to="/termos" className="block text-[var(--color-text-secondary)] hover:text-primary-500 transition-colors text-sm">
                Termos de Serviço
              </Link>
              <Link to="/privacidade" className="block text-[var(--color-text-secondary)] hover:text-primary-500 transition-colors text-sm">
                Política de Privacidade
              </Link>
            </div>

            {/* Social */}
            <div className="mt-6">
              <p className="text-[var(--color-text-muted)] text-sm">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[var(--color-text-primary)] font-semibold text-sm mt-1">
                ECO RJ - Desde 2016
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--glass-border)] mt-8 pt-8 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">
            © {new Date().getFullYear()} ECO RJ - Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70
          </p>
          <p className="text-[var(--color-text-muted)] text-xs mt-2 opacity-50 uppercase tracking-widest">
            Todos os Direitos Reservados
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

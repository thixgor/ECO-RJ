import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

const WELCOME_STORAGE_KEY = 'eco-rj-welcome-seen';

interface WelcomeModalProps {
    onClose?: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Verificar se já foi visto
        const hasSeenWelcome = localStorage.getItem(WELCOME_STORAGE_KEY);
        if (!hasSeenWelcome) {
            // Pequeno delay para a animação de entrada
            setTimeout(() => {
                setIsVisible(true);
                setIsAnimating(true);
            }, 500);
        }
    }, []);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            setIsVisible(false);
            localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
            onClose?.();
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-colors duration-short ${isAnimating ? 'bg-black/60' : 'bg-transparent'
                }`}
            onClick={handleClose}
        >
            <div
                className={`relative max-w-lg w-full bg-[var(--color-paper)] border border-[var(--color-rule-strong)] rounded-sm shadow-raised overflow-hidden transform transition-[transform,opacity] duration-short ease-out ${isAnimating ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabeçalho: régua de acento e rótulo. Os quatro corações
                    pulsando em opacidade baixa e a faísca ✨ saíram — decoração
                    animada não diz nada e é tell de interface gerada. */}
                <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-[var(--color-rule)]">
                    <p className="label-caps">Centro de Treinamento em Ecocardiografia</p>
                    <button
                        onClick={handleClose}
                        className="-mt-1 -mr-2 p-2 text-[var(--color-neutral)] hover:text-[var(--color-ink)] transition-colors duration-micro ease-out touch-target"
                        aria-label="Fechar"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6">
                    <h2 className="font-heading text-xl sm:text-2xl font-medium tracking-display text-[var(--color-ink-deep)]">
                        Esta é a nova plataforma do ECO RJ
                    </h2>

                    <p className="mt-4 text-sm text-[var(--color-muted)] leading-relaxed">
                        Se você usava o ambiente antigo: ele foi substituído por este.{' '}
                        <strong className="text-[var(--color-ink)] font-medium">
                            Seu progresso e seu acesso continuam preservados
                        </strong>{' '}
                        — nada precisa ser refeito. As aulas, os exercícios e o fórum estão
                        todos aqui, com uma navegação nova.
                    </p>

                    <div className="mt-6">
                        <button onClick={handleClose} className="glass-btn-primary">
                            Entrar na plataforma
                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>

                    <p className="mt-4 label-caps">Esta mensagem aparece só na primeira visita</p>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;

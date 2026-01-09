import React, { useState, useEffect } from 'react';
import { X, Sparkles, Heart, ArrowRight } from 'lucide-react';

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
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isAnimating ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
                }`}
            onClick={handleClose}
        >
            <div
                className={`relative max-w-lg w-full bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative header */}
                <div className="relative h-24 bg-gradient-to-r from-primary-500 via-primary-600 to-red-500 flex items-center justify-center overflow-hidden">
                    {/* Animated hearts background */}
                    <div className="absolute inset-0">
                        <Heart className="absolute top-2 left-4 w-6 h-6 text-white/20 animate-pulse" style={{ animationDelay: '0s' }} />
                        <Heart className="absolute top-8 right-8 w-4 h-4 text-white/15 animate-pulse" style={{ animationDelay: '0.5s' }} />
                        <Heart className="absolute bottom-3 left-1/4 w-5 h-5 text-white/10 animate-pulse" style={{ animationDelay: '1s' }} />
                        <Heart className="absolute bottom-4 right-1/3 w-3 h-3 text-white/20 animate-pulse" style={{ animationDelay: '0.3s' }} />
                    </div>

                    {/* Icon */}
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                    <h2 className="font-heading text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                        Bem-vindo à Nova Plataforma!
                    </h2>

                    <p className="text-sm text-primary-500 font-medium mb-4">
                        Curso de Ecocardiografia — ECO RJ
                    </p>

                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-5 text-left">
                        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-3">
                            <span className="font-semibold text-[var(--color-text-primary)]">
                                "O que aconteceu com a plataforma antiga?"
                            </span>
                        </p>
                        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                            Fique tranquilo! Este é o nosso <strong className="text-[var(--color-text-primary)]">novo ambiente de aprendizado</strong>.
                            Repaginamos toda a experiência para você — com uma interface mais moderna, intuitiva e otimizada
                            para o seu estudo. <strong className="text-[var(--color-text-primary)]">Todo o seu progresso e acesso continuam preservados.</strong>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
                        >
                            Explorar a Plataforma
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-xs text-[var(--color-text-muted)] mt-4">
                        Esta mensagem aparece apenas na primeira visita.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;

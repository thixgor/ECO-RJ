import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook que faz scroll automático para o topo quando a rota muda
 * Melhora a UX ao navegar entre páginas
 */
export const useScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Scroll suave para o topo
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [pathname]);
};

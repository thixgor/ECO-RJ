import { useEffect } from 'react';

/**
 * Hook que implementa scroll suave para a roda do mouse
 * Faz o scroll parecer mais fluido e natural
 */
export const useSmoothScroll = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    // Detectar se é mobile/touch device - não aplicar smooth scroll
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    let isScrolling = false;
    let targetScroll = window.scrollY;
    let currentScroll = window.scrollY;
    let animationFrameId: number | null = null;

    // Configurações do smooth scroll - mais suave e natural
    const smoothness = 0.06; // Menor = mais suave (0.05-0.15 é ideal)
    const scrollMultiplier = 0.8; // Multiplicador da velocidade do scroll

    const smoothScroll = () => {
      if (!isScrolling) return;

      const diff = targetScroll - currentScroll;

      // Se a diferença for muito pequena, parar a animação
      if (Math.abs(diff) < 0.5) {
        currentScroll = targetScroll;
        window.scrollTo(0, currentScroll);
        isScrolling = false;
        return;
      }

      // Interpolar suavemente
      currentScroll += diff * smoothness;
      window.scrollTo(0, currentScroll);

      animationFrameId = requestAnimationFrame(smoothScroll);
    };

    const handleWheel = (e: WheelEvent) => {
      // Ignorar se está dentro de um elemento com scroll próprio
      const target = e.target as HTMLElement;
      const scrollableParent = target.closest('.scroll-container, .overflow-auto, .overflow-y-auto, .overflow-scroll, [data-scroll-container]');

      if (scrollableParent && scrollableParent !== document.documentElement && scrollableParent !== document.body) {
        // Verificar se o elemento tem scroll e não está no limite
        const el = scrollableParent as HTMLElement;
        const isAtTop = el.scrollTop === 0;
        const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

        // Se não está no limite, deixar o scroll natural do elemento
        if (!(isAtTop && e.deltaY < 0) && !(isAtBottom && e.deltaY > 0)) {
          return;
        }
      }

      e.preventDefault();

      // Atualizar o scroll atual para sincronizar com a posição real
      if (!isScrolling) {
        currentScroll = window.scrollY;
      }

      // Calcular novo target
      const delta = e.deltaY * scrollMultiplier;
      targetScroll = Math.max(
        0,
        Math.min(
          document.documentElement.scrollHeight - window.innerHeight,
          targetScroll + delta
        )
      );

      // Iniciar animação se não estiver rodando
      if (!isScrolling) {
        isScrolling = true;
        animationFrameId = requestAnimationFrame(smoothScroll);
      }
    };

    // Sincronizar quando o usuário scrollar de outras formas (keyboard, scrollbar)
    const handleScroll = () => {
      if (!isScrolling) {
        currentScroll = window.scrollY;
        targetScroll = window.scrollY;
      }
    };

    // Adicionar listener com passive: false para poder usar preventDefault
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled]);
};

export default useSmoothScroll;

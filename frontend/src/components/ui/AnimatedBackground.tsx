import React from 'react';

/**
 * DESATIVADO no redesenho editorial (ver `design.md`).
 *
 * Este componente pintava três blobs desfocados animando em loop infinito atrás
 * de todo o conteúdo da plataforma — o "aurora background". É o tell nº 1 de
 * interface gerada por IA, não carregava informação nenhuma e custava GPU em
 * cada frame, inclusive no celular.
 *
 * O componente continua exportado para não quebrar importações existentes, mas
 * não renderiza nada. A superfície da plataforma agora é papel liso
 * (`--color-paper`), dividido por régua fina.
 */
interface AnimatedBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'normal' | 'vibrant';
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = () => null;

export default AnimatedBackground;

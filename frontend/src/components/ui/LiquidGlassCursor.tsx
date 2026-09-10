import React from 'react';

/**
 * DESATIVADO no redesenho editorial (ver `design.md`).
 *
 * Este componente substituía o cursor do sistema por um disco de vidro que
 * seguia o ponteiro com atraso. Cursor customizado é proibido pelo sistema:
 * sequestra uma affordance que o sistema operacional já resolve, atrapalha
 * quem usa ampliador de tela e roda um `requestAnimationFrame` permanente.
 *
 * Mantido exportado para não quebrar importações; não renderiza nada.
 */
interface LiquidGlassCursorProps {
  size?: number;
  enabled?: boolean;
}

export const LiquidGlassCursor: React.FC<LiquidGlassCursorProps> = () => null;

export default LiquidGlassCursor;

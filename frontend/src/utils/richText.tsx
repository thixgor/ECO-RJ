import React from 'react';

/**
 * Converte marcações simples de negrito (**texto**) em elementos <strong>.
 * Mantém o restante do texto intacto e é seguro contra XSS
 * (não utiliza dangerouslySetInnerHTML).
 *
 * Uso: {renderBold(material.descricaoCurta)}
 */
export const renderBold = (text?: string | null): React.ReactNode => {
  if (!text) return null;

  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    if (match) {
      return (
        <strong key={index} className="font-semibold text-[var(--color-text-primary)]">
          {match[1]}
        </strong>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

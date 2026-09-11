import React, { useEffect, useRef, useState } from 'react';

/**
 * Transição eletrocardiográfica entre questões.
 *
 * Um traçado de ECG (ritmo sinusal com dois complexos QRS) é "escrito" da
 * esquerda para a direita, com um ponto luminoso na ponta da linha e um pulso
 * radial no pico R — a mesma sensação de um monitor cardíaco. Serve como
 * respiro entre uma questão e a próxima, marcando a virada de página.
 *
 * Respeita `prefers-reduced-motion`: quem pediu menos movimento vê apenas um
 * fade curto, sem o traçado animado.
 */

export const ECG_TRANSITION_MS = 700;

interface Props {
  /** Dispara a animação quando muda para true. */
  active: boolean;
  /** Rótulo curto exibido sob o traçado (ex.: "Questão 3 de 10"). */
  label?: string;
  /** Cor do traçado; padrão usa o azul da marca. */
  color?: string;
}

/**
 * Traçado de ECG em coordenadas do viewBox 0 0 300 80.
 * Linha de base → P → QRS → T, repetido, terminando em linha de base.
 */
const ECG_PATH =
  'M0,40 H32 ' +
  'q6,-9 12,0 ' +           // onda P
  'H58 L64,40 L70,12 L76,68 L82,34 L88,40 ' + // complexo QRS
  'H104 q9,-12 18,0 ' +     // onda T
  'H150 ' +
  'q6,-9 12,0 ' +           // onda P (2º ciclo)
  'H176 L182,40 L188,12 L194,68 L200,34 L206,40 ' +
  'H222 q9,-12 18,0 ' +
  'H300';

const EcgTransition: React.FC<Props> = ({ active, label, color = '#1E90FF' }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      setVisible(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setVisible(false), ECG_TRANSITION_MS);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [active]);

  if (!visible) return null;

  return (
    <div className="ecg-transition" aria-hidden="true">
      <div className="ecg-transition__inner">
        <svg viewBox="0 0 300 80" className="ecg-transition__svg" preserveAspectRatio="none">
          {/* Linha de base fantasma, para o traçado não "aparecer do nada" */}
          <path d={ECG_PATH} fill="none" stroke={color} strokeOpacity={0.12} strokeWidth={2} />
          {/* Traçado desenhado progressivamente */}
          <path
            d={ECG_PATH}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ecg-transition__trace"
          />
        </svg>
        {/* Ponto luminoso que percorre o traçado */}
        <span className="ecg-transition__blip" style={{ background: color }} />
        {label && <p className="ecg-transition__label">{label}</p>}
      </div>
    </div>
  );
};

export default EcgTransition;

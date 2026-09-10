# Design — ECO RJ · Centro de Treinamento em Ecocardiografia

Sistema de design travado desta plataforma. **Toda página lê este arquivo antes de emitir
código.** Não regenere por página — estenda ou emende este arquivo quando o sistema
precisar crescer.

Produzido por `hallmark redesign` (escopo: aplicação inteira). A regra de diversificação
do Hallmark está **invertida** aqui: entre páginas do mesmo produto, consistência é o
objetivo, não variedade.

---

## Genre

**editorial** — instituição acadêmica/científica. A autoridade vem da tipografia, da
régua fina e do espaço em branco; nunca de efeito visual.

Motivo do gênero: o produto é um centro de treinamento médico. O público é composto por
médicos. Uma interface que parece um app de consumo (vidro, gradiente, brilho pulsante)
mina a credibilidade do conteúdo clínico que ela carrega.

## Macrostructure family

Três famílias. Páginas dentro de uma família compartilham a forma; variam apenas nos
arquétipos de componente.

- **Páginas públicas / marketing** — `15 · Split Studio`.
  Díptico: afirmação de um lado, prova do outro; a direção alterna descendo a página.
  Variação permitida: proporção da coluna (7/5 · 6/6 · 5/7) e lado da prova.
  Aplica-se a: `Home`, `PatientHome`, `Courses`, `CourseDetail`, `Materiais`,
  `MaterialDetail`, `Login`, `Register`, `Ativar`.

- **Páginas de aplicação** — `13 · Index-First`.
  A página É uma lista. Réguas finas entre linhas, sem cartão flutuante, sem ícone
  decorativo. Variação permitida: densidade das linhas e presença de coluna de filtros.
  Aplica-se a: `Dashboard`, `Lesson`, `Exercises`, `Forum`, `ForumTopic`, `Profile`,
  e às 13 telas de `/admin`.

- **Páginas de conteúdo** — `02 · Long Document`.
  Coluna única, medida de 65ch, entrelinha 1.65, títulos que emergem do fluxo.
  Aplica-se a: `Terms`, `Privacy`, `ValidateCertificate`, `AppDownload`.

## Theme

Paleta OKLCH construída sob medida, âncora **hue 250** (azul institucional).
Os neutros são tingidos na âncora — nada de cinza puro (chroma zero).

### Light

| Token | OKLCH | hex (Tailwind) | Papel |
|---|---|---|---|
| `--color-paper` | `oklch(98.2% 0.004 250)` | `#F7F9FC` | superfície base |
| `--color-paper-2` | `oklch(96.0% 0.007 250)` | `#EEF2F6` | faixa/superfície elevada |
| `--color-paper-3` | `oklch(93.2% 0.010 250)` | `#E4E9EF` | hover / pressionado |
| `--color-rule` | `oklch(88.0% 0.012 250)` | `#D2D8DF` | régua fina (hairline) |
| `--color-rule-strong` | `oklch(78.0% 0.014 250)` | `#B1B8C0` | régua de ênfase |
| `--color-neutral` | `oklch(54.0% 0.016 250)` | `#687078` | texto terciário, ícones |
| `--color-muted` | `oklch(46.0% 0.018 250)` | `#515962` | texto secundário |
| `--color-ink` | `oklch(22.0% 0.020 250)` | `#141B24` | texto primário |
| `--color-ink-deep` | `oklch(15.0% 0.022 250)` | `#050C14` | display / títulos |
| `--color-accent` | `oklch(42.0% 0.125 252)` | `#014E8E` | **âncora da marca** |
| `--color-accent-hover` | `oklch(34.0% 0.112 252)` | `#00386F` | estado hover do acento |
| `--color-accent-soft` | `oklch(94.5% 0.028 250)` | `#DFEFFF` | lavagem de acento |
| `--color-accent-tint` | `oklch(89.0% 0.045 250)` | `#C5DEF8` | borda de acento |
| `--color-focus` | `oklch(52.0% 0.160 252)` | `#0069C1` | anel de foco |

### Dark

Mesma âncora. **Só lightness e chroma se movem — o hue nunca muda entre modos.**

| Token | OKLCH | hex |
|---|---|---|
| `--color-paper` | `oklch(16.0% 0.014 250)` | `#090E13` |
| `--color-paper-2` | `oklch(19.8% 0.016 250)` | `#10161D` |
| `--color-paper-3` | `oklch(24.5% 0.018 250)` | `#1A2129` |
| `--color-rule` | `oklch(30.5% 0.016 250)` | `#293037` |
| `--color-rule-strong` | `oklch(40.0% 0.018 250)` | `#414951` |
| `--color-neutral` | `oklch(61.0% 0.014 250)` | `#7D848B` |
| `--color-muted` | `oklch(73.0% 0.012 250)` | `#A2A8AF` |
| `--color-ink` | `oklch(93.0% 0.008 250)` | `#E4E8ED` |
| `--color-ink-deep` | `oklch(97.0% 0.006 250)` | `#F2F5F9` |
| `--color-accent` | `oklch(72.0% 0.105 252)` | `#73A9E5` |
| `--color-focus` | `oklch(75.0% 0.130 252)` | `#6EB2FE` |

### Cores semânticas

Restritas e tingidas. Nunca vermelho/verde como único sinal — sempre acompanhados de
ícone ou rótulo.

`--color-danger` `#A52A26` · `--color-success` `#1F6B41` · `--color-warning` `#8D5E00`
(light) — cada um com um par `-soft` para fundo.

### Contraste verificado (WCAG 2.1, contra `--color-paper`)

| Token | Light | Dark |
|---|---|---|
| ink | 16.4:1 | 15.7:1 |
| muted | 6.7:1 | 8.1:1 |
| neutral | 4.8:1 | 5.1:1 |
| accent | 8.0:1 | 7.9:1 |
| focus | 5.3:1 | 8.7:1 |
| danger / success / warning | ≥ 5.3:1 | ≥ 6.3:1 |

### Por que hex também

O Tailwind 3 precisa de um valor hex para compor opacidade (`bg-accent/15` vira
`rgb(1 78 142 / 0.15)`); ele não sabe fazer isso a partir de uma string OKLCH. Então
`tailwind.config.js` carrega os hex acima **com o OKLCH-fonte citado em comentário**.
O OKLCH em `frontend/src/tokens.css` é a fonte de verdade; o hex é derivado.

## Typography

Três famílias — o teto do Hallmark. Nenhuma delas é fonte-padrão de LLM.

- **Display:** `Newsreader` — serifa romana com eixo óptico. Pesos 400 / 500 / 600.
  `font-style: normal` sempre. **Título em itálico é proibido** (tell de IA).
- **Body:** `IBM Plex Sans` — a sans institucional/de engenharia da IBM. Pesos 400 / 500 / 600.
- **Outlier (`--font-mono`):** `IBM Plex Mono` — carrega **um papel só: dado**.
  Serial keys, CNPJ, datas, números tabulares, rótulos em caixa alta com tracking.
  Nunca em prosa, nunca em botão.

Tracking do display: `-0.018em`. Rótulos em caixa alta: `+0.10em`.
Escala: terça maior (1.25) a partir de 16px. `--text-display: clamp(2.5rem, 4.5vw + 1rem, 4.5rem)`.
Teto de display: 4.5rem — nunca acima.
Números em tabela: `font-variant-numeric: tabular-nums` obrigatório.

Removidas do projeto: **Inter** e **Poppins** — ambas na lista de padrões-de-LLM do Hallmark.

## Spacing

Escala nomeada de 4pt. Valores em `frontend/src/tokens.css`. As páginas usam tokens
nomeados (`var(--space-lg)`), nunca valores crus.

`3xs 2px · 2xs 4px · xs 8px · sm 12px · md 16px · lg 24px · xl 40px · 2xl 64px · 3xl 96px · 4xl 144px`

Ritmo entre seções principais: mínimo `--space-3xl`. **O espaçamento vertical varia entre
seções de propósito** — padding idêntico em tudo é o ritmo achatado que denuncia template.

## Motion

- Easings: `--ease-out cubic-bezier(0.16, 1, 0.3, 1)` · `--ease-in cubic-bezier(0.7, 0, 0.84, 0)`
  · `--ease-in-out cubic-bezier(0.65, 0, 0.35, 1)`. O `ease` padrão do navegador é proibido.
- Durações: `--dur-micro 120ms` · `--dur-short 220ms` · `--dur-long 420ms`. Saída = 75% da entrada.
- **Só `transform` e `opacity` animam.** Nunca width/height/top/left/margin/padding.
- Padrão de revelação: **uma** entrada orquestrada no carregamento, escalonada por
  `--i` no DOM, teto de 500ms. Nada de fade-up em cada seção ao rolar.
- `prefers-reduced-motion: reduce` → todo movimento espacial vira crossfade de opacidade ≤ 150ms.
- **Proibido:** bounce/overshoot em UI, cursor customizado, parallax, loop infinito
  decorativo, `transition-all`, anel de foco animado.

## Microinteractions stance

- **Sucesso silencioso.** Toast só para falha, ação assíncrona cujo efeito não é visível,
  e confirmação que o usuário vai precisar reler (ex.: serial key ativada).
- **Update otimista + Desfazer** no lugar de diálogo de confirmação, para ação reversível.
  Modal só para destruição irreversível.
- Tooltip: hover com atraso de 800ms; foco com atraso de 0ms.
- Anel de foco aparece **instantaneamente** — nunca com transição.
- Um sinal por elemento no hover. Não empilhe cor + escala + sombra + sublinhado.

## CTA voice

- **Primário:** retângulo sólido `--color-accent`, raio `3px`, texto `--color-accent-ink`,
  peso 500, sem gradiente, sem sombra colorida. Hover: escurece para `--color-accent-hover`.
  Pressionado: `translateY(1px)`.
- **Secundário:** contorno de 1px em `--color-rule-strong`, fundo transparente,
  texto `--color-ink`. Hover: borda vira `--color-accent`.
- **Terciário:** link tipográfico — palavra + `→` + sublinhado de 1px que engrossa no hover.
  Sem caixa, sem preenchimento.
- Rótulo de CTA: verbo no infinitivo, curto. `Ver cursos`, não `Ver Cursos Disponíveis Agora`.
  **Rótulo clicável nunca quebra em duas linhas** (`white-space: nowrap`).

## Per-page allowances

- Páginas públicas **podem** usar imagem real (foto do professor, capa de curso) em
  `<figure>` com régua fina no máximo. Nada de moldura falsa de navegador ou celular.
- Páginas de aplicação **não** usam enriquecimento. A função carrega a página.
- Páginas de conteúdo: tipografia apenas.
- **Nenhuma página inventa métrica.** Se o número não veio do banco ou do cliente, a
  seção não existe. Um buraco em forma de número é honesto; um número fabricado é slop.

## What pages MUST share

- O logotipo e a linha institucional: **ECO RJ · Centro de Treinamento em Ecocardiografia**.
  (Não existe "Centro de Exames em Ecocardiografia".)
- A cor de acento e sua dosagem — **≤ 5% de qualquer viewport**. O acento é marcador, não
  bloco de cor.
- As três famílias tipográficas e os papéis de cada uma.
- A voz do CTA (forma, raio, ritmo de padding).
- A régua fina de 1px como linguagem de divisão. **Cartão flutuante não é divisor.**
- Uma única biblioteca de ícones: **Lucide**, traço 1.5px. Sem emoji como ícone.

## What pages MAY differ on

- Macroestrutura dentro da família do tipo de página.
- Proporção do díptico e lado da prova (Split Studio).
- Densidade das linhas do índice (Index-First).
- Presença e posição de uma imagem real.

## Banned outright neste projeto

Cada item abaixo estava no código antes deste redesenho e é um tell nomeado do Hallmark:

| Proibido | Onde estava |
|---|---|
| Glassmorphism (`backdrop-filter` como decoração) | 153 usos de `glass-card` |
| Blobs `blur-3xl` de fundo | 12 ocorrências + `AnimatedBackground` global |
| `text-gradient` (`background-clip: text`) | 8 ocorrências, inclusive no logotipo |
| Cursor customizado | `LiquidGlassCursor` montado em `App.tsx` |
| `animate-pulse` / `bounce` / `ping` decorativo | 27 ocorrências |
| Gradiente como preenchimento de botão / ícone | 66 usos de `bg-gradient-to-*` |
| Métrica inventada (`500+`, `20+`, `100h+`) | `Home.tsx` |
| 5 estrelas fixas em depoimento | `Home.tsx` |
| Voz de infoproduto (`VOCÊ NÃO PODE PERDER!`) | `Home.tsx` |
| Ícone ladeando o título dos dois lados | 4 seções |
| Easing com overshoot (`bounce-soft`) | `tailwind.config.js` |
| Preto puro / branco puro | `#0a0a0f`, `#FFFFFF` |

## Exports

### tokens.css

Fonte de verdade em `frontend/src/tokens.css`, importado no topo de
`frontend/src/index.css` antes das diretivas do Tailwind. Contém todos os
`--color-*`, `--font-*`, `--space-*`, `--text-*`, `--ease-*`, `--dur-*`,
`--rule-*`, `--radius-*` e `--z-*` usados na plataforma.

### Camada de compatibilidade

O código legado referencia `var(--glass-bg)`, `var(--color-text-primary)` etc. em
centenas de lugares. Em vez de reescrever 40 arquivos, `tokens.css` mantém esses nomes
vivos como **aliases** apontando para os tokens novos:

```
--color-bg-primary  → var(--color-paper)
--color-text-primary→ var(--color-ink)
--color-text-secondary → var(--color-muted)
--color-text-muted  → var(--color-neutral)
--glass-bg          → var(--color-paper-2)   /* opaco agora */
--glass-border      → var(--color-rule)
--glass-blur        → 0px
```

É por isso que o redesenho alcança toda a plataforma sem tocar em lógica de negócio.
**Aliases são ponte, não destino** — código novo usa os tokens nomeados diretamente.

### Tailwind v4 `@theme` (para migração futura)

```css
@theme {
  --color-paper:   oklch(98.2% 0.004 250);
  --color-ink:     oklch(22.0% 0.020 250);
  --color-accent:  oklch(42.0% 0.125 252);
  --font-display:  "Newsreader", ui-serif, Georgia, serif;
  --font-body:     "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono:     "IBM Plex Mono", ui-monospace, monospace;
  --spacing-lg:    1.5rem;
  --text-md:       1.125rem;
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
}
```

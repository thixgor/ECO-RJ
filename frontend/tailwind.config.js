/** @type {import('tailwindcss').Config} */

/*
 * Hallmark · genre: editorial · design-system: design.md · designed-as-app
 *
 * A fonte de verdade das cores é `src/tokens.css`, em OKLCH.
 * Os hex abaixo são a MESMA cor, derivada — o Tailwind 3 precisa de hex para
 * compor opacidade (`bg-primary-500/15` → `rgb(1 78 142 / 0.15)`); ele não sabe
 * fazer isso a partir de uma string OKLCH. O OKLCH-fonte fica citado em cada linha.
 * Ao mudar uma cor, mude nos DOIS lugares.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Rampa da marca — azul institucional, âncora hue ~252.
        primary: {
          50:  '#EFF7FF', // oklch(97.2% 0.014 250)
          100: '#DFEFFF', // oklch(94.5% 0.028 250)  = --color-accent-soft
          200: '#C5DEF8', // oklch(89.0% 0.045 250)  = --color-accent-tint
          300: '#97BFEA', // oklch(79.0% 0.075 251)
          400: '#4C88C7', // oklch(61.5% 0.115 251)  — acento no modo escuro
          500: '#014E8E', // oklch(42.0% 0.125 252)  = --color-accent  ★ âncora
          600: '#00386F', // oklch(34.0% 0.112 252)  = --color-accent-hover
          700: '#002855', // oklch(28.0% 0.095 252)
          800: '#001B3D', // oklch(22.5% 0.075 252)
          900: '#001027', // oklch(17.5% 0.055 252)
        },

        // Superfícies. Nada de branco puro nem preto puro — tudo tingido na âncora.
        paper: {
          DEFAULT: '#F7F9FC', // oklch(98.2% 0.004 250)
          2: '#EEF2F6',       // oklch(96.0% 0.007 250)
          3: '#E4E9EF',       // oklch(93.2% 0.010 250)
        },
        rule: {
          DEFAULT: '#D2D8DF', // oklch(88.0% 0.012 250)
          strong: '#B1B8C0',  // oklch(78.0% 0.014 250)
        },
        ink: {
          DEFAULT: '#141B24', // oklch(22.0% 0.020 250)
          deep: '#050C14',    // oklch(15.0% 0.022 250)
          muted: '#515962',   // oklch(46.0% 0.018 250)
          neutral: '#687078', // oklch(54.0% 0.016 250)
        },

        background: '#F7F9FC',
        text: '#141B24',

        dark: {
          bg: '#090E13',      // oklch(16.0% 0.014 250)
          surface: '#10161D', // oklch(19.8% 0.016 250)
          card: '#1A2129',    // oklch(24.5% 0.018 250)
          border: '#293037',  // oklch(30.5% 0.016 250)
          text: '#E4E8ED',    // oklch(93.0% 0.008 250)
          muted: '#A2A8AF',   // oklch(73.0% 0.012 250)
        },

        /* ------------------------------------------------------------------
         * NEUTROS SOBRESCRITOS.
         *
         * O código tem ~800 usos de `bg-white`, `bg-gray-50`, `text-gray-400`,
         * `dark:bg-white/5` etc. Os neutros padrão do Tailwind têm chroma ZERO:
         * cinza morto ao lado de uma paleta tingida em azul. Em vez de editar
         * 800 lugares, redefinimos os próprios tokens — cada um vira a mesma
         * cor da paleta, tingida na âncora hue 250.
         *
         * Efeito colateral desejado: `bg-white` deixa de ser #FFF (banido pelo
         * sistema) e passa a ser o papel; `text-white` sobre o acento continua
         * legível porque o papel tem 98% de lightness.
         * ------------------------------------------------------------------ */
        white: '#F7F9FC',   // oklch(98.2% 0.004 250) — papel, não branco puro
        black: '#050C14',   // oklch(15.0% 0.022 250) — tinta, não preto puro
        gray: {
          50:  '#F3F6F9', // oklch(97.2% 0.005 250)
          100: '#E9EDF1', // oklch(94.5% 0.007 250)
          200: '#D2D8DF', // oklch(88.0% 0.012 250)  = --color-rule
          300: '#B7BFC7', // oklch(80.0% 0.014 250)
          400: '#687078', // oklch(54.0% 0.016 250)  4.8:1 no papel
          500: '#575F67', // oklch(48.0% 0.017 250)  6.2:1
          600: '#464E57', // oklch(42.0% 0.018 250)  8.0:1
          700: '#2C343C', // oklch(32.0% 0.018 250)
          800: '#171E25', // oklch(23.0% 0.018 250)
          900: '#090E13', // oklch(16.0% 0.014 250)  = papel escuro
          950: '#03060A', // oklch(12.0% 0.012 250)
        },

        /* ------------------------------------------------------------------
         * MATIZES FORA DA PALETA, REDIRECIONADAS.
         *
         * O código usava 768 vezes `amber`, `emerald`, `green`, `blue`,
         * `purple`, `yellow`, `orange`, `teal`, `cyan` — nove matizes soltas
         * numa plataforma que declara UM acento. Em vez de editar 768 lugares,
         * cada matiz é reapontada para a rampa semântica correspondente:
         *
         *   amber · yellow · orange  → aviso    (hue 75)
         *   emerald · green · teal   → sucesso  (hue 155)
         *   red · rose               → perigo   (hue 27)
         *   blue · cyan · indigo     → o próprio azul da marca (hue 252)
         *   purple · violet · pink   → NEUTRO. Roxo decorativo é a assinatura
         *                              cromática de interface gerada por IA;
         *                              aqui ele simplesmente deixa de existir.
         *
         * Cada rampa foi construída em OKLCH com a mesma curva de lightness,
         * então `text-amber-600` e `text-emerald-600` têm exatamente o mesmo
         * peso óptico — coisa que as paletas padrão do Tailwind não garantem.
         * ------------------------------------------------------------------ */
        red: {
          50: '#FFEDE9',
          100: '#FFDCD7',
          200: '#FFC3BB',
          300: '#F09F95',
          400: '#CD6056',
          500: '#A52A26',
          600: '#8D1A19',
          700: '#6F0D0E',
          800: '#510607',
          900: '#340404',
        },
        rose: {
          50: '#FFEDE9',
          100: '#FFDCD7',
          200: '#FFC3BB',
          300: '#F09F95',
          400: '#CD6056',
          500: '#A52A26',
          600: '#8D1A19',
          700: '#6F0D0E',
          800: '#510607',
          900: '#340404',
        },
        emerald: {
          50: '#E9F8ED',
          100: '#D7EFDE',
          200: '#BADFC6',
          300: '#93C5A4',
          400: '#4F986B',
          500: '#0B703F',
          600: '#005D31',
          700: '#004823',
          800: '#003317',
          900: '#001F0C',
        },
        green: {
          50: '#E9F8ED',
          100: '#D7EFDE',
          200: '#BADFC6',
          300: '#93C5A4',
          400: '#4F986B',
          500: '#0B703F',
          600: '#005D31',
          700: '#004823',
          800: '#003317',
          900: '#001F0C',
        },
        teal: {
          50: '#E9F8ED',
          100: '#D7EFDE',
          200: '#BADFC6',
          300: '#93C5A4',
          400: '#4F986B',
          500: '#0B703F',
          600: '#005D31',
          700: '#004823',
          800: '#003317',
          900: '#001F0C',
        },
        amber: {
          50: '#FCF2E5',
          100: '#F6E5CF',
          200: '#E9D0AF',
          300: '#D3B184',
          400: '#AA7D39',
          500: '#825200',
          600: '#6E4200',
          700: '#563100',
          800: '#3E2200',
          900: '#271300',
        },
        yellow: {
          50: '#FCF2E5',
          100: '#F6E5CF',
          200: '#E9D0AF',
          300: '#D3B184',
          400: '#AA7D39',
          500: '#825200',
          600: '#6E4200',
          700: '#563100',
          800: '#3E2200',
          900: '#271300',
        },
        orange: {
          50: '#FCF2E5',
          100: '#F6E5CF',
          200: '#E9D0AF',
          300: '#D3B184',
          400: '#AA7D39',
          500: '#825200',
          600: '#6E4200',
          700: '#563100',
          800: '#3E2200',
          900: '#271300',
        },
        blue: {
          50: '#E7F5FF',
          100: '#D4EBFF',
          200: '#B6D8FF',
          300: '#8DBBF0',
          400: '#4789D0',
          500: '#005EAC',
          600: '#004D94',
          700: '#003A75',
          800: '#002856',
          900: '#001837',
        },
        cyan: {
          50: '#E7F5FF',
          100: '#D4EBFF',
          200: '#B6D8FF',
          300: '#8DBBF0',
          400: '#4789D0',
          500: '#005EAC',
          600: '#004D94',
          700: '#003A75',
          800: '#002856',
          900: '#001837',
        },
        indigo: {
          50: '#E7F5FF',
          100: '#D4EBFF',
          200: '#B6D8FF',
          300: '#8DBBF0',
          400: '#4789D0',
          500: '#005EAC',
          600: '#004D94',
          700: '#003A75',
          800: '#002856',
          900: '#001837',
        },
        purple: {
          50: '#F3F6F9',
          100: '#E9EDF1',
          200: '#D2D8DF',
          300: '#B7BFC7',
          400: '#687078',
          500: '#575F67',
          600: '#464E57',
          700: '#2C343C',
          800: '#171E25',
          900: '#090E13',
          950: '#03060A',
        },
        violet: {
          50: '#F3F6F9',
          100: '#E9EDF1',
          200: '#D2D8DF',
          300: '#B7BFC7',
          400: '#687078',
          500: '#575F67',
          600: '#464E57',
          700: '#2C343C',
          800: '#171E25',
          900: '#090E13',
          950: '#03060A',
        },
        pink: {
          50: '#F3F6F9',
          100: '#E9EDF1',
          200: '#D2D8DF',
          300: '#B7BFC7',
          400: '#687078',
          500: '#575F67',
          600: '#464E57',
          700: '#2C343C',
          800: '#171E25',
          900: '#090E13',
          950: '#03060A',
        },

        // Sinal semântico — sempre acompanhado de ícone ou rótulo, nunca só cor.
        signal: {
          danger: '#A52A26',   // oklch(48% 0.160  27)
          success: '#1F6B41',  // oklch(47% 0.100 155)
          warning: '#8D5E00',  // oklch(52% 0.110  75)
          focus: '#0069C1',    // oklch(52% 0.160 252)
        },
      },

      fontFamily: {
        // `font-sans` é o corpo; `font-heading` é o display serifado;
        // `font-mono` carrega UM papel: dado (chave, CNPJ, data, número).
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Newsreader', 'ui-serif', 'Georgia', '"Times New Roman"', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.3' }],
      },

      /* Newsreader e IBM Plex Sans são carregadas em 400/500/600. `font-bold`
       * (700) faria o navegador SINTETIZAR o peso — engorda falsa, proibida
       * pelo sistema. Os 158 usos de `font-bold` passam a resolver para 600,
       * que existe de verdade nos dois arquivos. */
      fontWeight: {
        bold: '600',
        extrabold: '600',
        black: '600',
      },

      letterSpacing: {
        display: '-0.018em',
        label: '0.1em',
      },

      borderRadius: {
        // Raio contido: papel dobrado, não bolha.
        xs: '2px',
        sm: '3px',
        DEFAULT: '3px',
        md: '4px',
        lg: '6px',
        xl: '6px',
        '2xl': '8px',
        '3xl': '8px',
      },

      // Só entrada orquestrada. Nada de blob, brilho pulsante ou shimmer.
      animation: {
        'fade-in': 'fadeIn 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slideDown 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'none' },
        },
      },

      // Duas sombras no sistema inteiro. Hierarquia é peso e escala, não sombra.
      boxShadow: {
        whisper: '0 1px 2px rgb(20 27 36 / 0.06)',
        raised: '0 4px 16px rgb(20 27 36 / 0.10)',
        none: 'none',
      },

      transitionTimingFunction: {
        // `ease` do navegador é proibido; overshoot em UI também.
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.7, 0, 0.84, 0)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
        apple: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      transitionDuration: {
        micro: '120ms',
        short: '220ms',
        long: '420ms',
      },

      maxWidth: {
        measure: '65ch',
      },

      zIndex: {
        raised: '10',
        dropdown: '100',
        sticky: '200',
        'sticky-nav': '300',
        modal: '400',
        toast: '500',
        tooltip: '600',
      },
    },
  },
  plugins: [],
}

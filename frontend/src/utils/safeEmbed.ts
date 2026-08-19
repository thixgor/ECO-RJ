/**
 * Construção de embeds de vídeo seguros.
 *
 * PROBLEMA QUE ISTO RESOLVE
 * -------------------------
 * Vários pontos da aplicação jogavam um campo vindo do banco direto em
 * `dangerouslySetInnerHTML`: `lesson.embedVideo`, `topic.embedVideo`,
 * `reply.embedVideo`, `config.demoVideo.embedCode`. Esse campo é texto livre
 * digitado no painel (aulas, config do site) ou no fórum (instrutores).
 *
 * Como a CSP da aplicação libera `script-src 'unsafe-inline'`, qualquer HTML
 * salvo ali era executado no navegador de quem abrisse a página — um
 * `<img src=x onerror="...">` num tópico do fórum roubaria o JWT (que fica em
 * `localStorage`) de todo mundo que lesse o tópico, administrador incluído.
 *
 * A solução aqui não é "limpar" o HTML recebido — é **nunca reemitir a marcação
 * de origem**. Extraímos apenas a URL, conferimos o domínio contra uma lista de
 * permitidos (a mesma da CSP em `vercel.json`) e montamos um `<iframe>` novo,
 * com atributos escritos por nós.
 *
 * Efeito colateral bem-vindo: o administrador pode colar tanto o `<iframe>`
 * completo quanto só o link do YouTube/Vimeo, ou até o ID do vídeo.
 */

/** Domínios que podem ser carregados em um iframe (espelha `frame-src` da CSP). */
const HOSTS_PERMITIDOS = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
  'vimeo.com',
  'www.google.com',
  'www.openstreetmap.org',
  'zoom.us'
];

const hostPermitido = (host: string): boolean =>
  HOSTS_PERMITIDOS.includes(host) ||
  host.endsWith('.zoom.us') ||
  host.endsWith('.vimeo.com') ||
  host.endsWith('.openstreetmap.org');

/** Escapa um valor para uso seguro dentro de um atributo HTML entre aspas. */
const escaparAtributo = (valor: string): string =>
  valor
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ID_YOUTUBE = /(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/;
const ID_VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/;

/**
 * Descobre a URL de reprodução a partir de qualquer formato aceito:
 * iframe colado, link de compartilhamento, link curto ou ID puro do YouTube.
 * Retorna `null` quando não reconhece nada confiável.
 */
export const extrairUrlEmbed = (entrada: string): string | null => {
  const texto = (entrada || '').trim();
  if (!texto) return null;

  // 1. YouTube em qualquer formato → sempre normalizado para /embed/<id>
  const yt = texto.match(ID_YOUTUBE);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  // 2. Vimeo em qualquer formato → player oficial
  const vimeo = texto.match(ID_VIMEO);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // 3. Iframe de outro provedor permitido: aproveitamos só o `src`
  const src = texto.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  const candidato = src ? src[1] : texto;

  // 4. ID de vídeo do YouTube colado sozinho
  if (/^[\w-]{11}$/.test(candidato)) {
    return `https://www.youtube.com/embed/${candidato}`;
  }

  try {
    const url = new URL(candidato, window.location.origin);
    if (url.protocol !== 'https:') return null;
    if (!hostPermitido(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
};

interface OpcoesEmbed {
  /** Liga a API JS do player (o Lesson usa para acompanhar o progresso). */
  comApi?: boolean;
  /** `id` do elemento iframe, usado pelos controles do player. */
  id?: string;
  /** Preenche o container pai em vez de usar proporção 16:9 própria. */
  absoluto?: boolean;
  /** `title` do iframe — importante para leitores de tela. */
  titulo?: string;
}

/**
 * Devolve o HTML de um `<iframe>` seguro para a entrada informada, ou string
 * vazia se a entrada não apontar para um provedor permitido.
 */
export const construirEmbedSeguro = (entrada: string, opcoes: OpcoesEmbed = {}): string => {
  const url = extrairUrlEmbed(entrada);
  if (!url) return '';

  const { comApi = false, id, absoluto = true, titulo = 'Vídeo' } = opcoes;

  let final = url;
  if (comApi) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube')) {
        u.searchParams.set('enablejsapi', '1');
        u.searchParams.set('origin', window.location.origin);
        u.searchParams.set('widget_referrer', window.location.origin);
      } else if (u.hostname.includes('vimeo')) {
        u.searchParams.set('api', '1');
        u.searchParams.set('player_id', id || 'vimeo-player');
      }
      final = u.toString();
    } catch {
      /* mantém a URL original se ela não puder ser reescrita */
    }
  }

  const estilo = absoluto
    ? 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;'
    : 'width:100%;aspect-ratio:16/9;border:0;';

  return [
    '<iframe',
    id ? ` id="${escaparAtributo(id)}"` : '',
    ` src="${escaparAtributo(final)}"`,
    ` title="${escaparAtributo(titulo)}"`,
    ` style="${estilo}"`,
    ' frameborder="0" loading="lazy" allowfullscreen',
    ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"',
    ' referrerpolicy="strict-origin-when-cross-origin"',
    '></iframe>'
  ].join('');
};

/** `true` se a entrada resulta em um embed exibível. */
export const temEmbedValido = (entrada?: string | null): boolean =>
  !!entrada && extrairUrlEmbed(entrada) !== null;

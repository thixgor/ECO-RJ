/**
 * Extrai o ID do vídeo do YouTube de uma URL ou código embed
 */
export const extractYouTubeId = (input: string): string | null => {
  if (!input) return null;

  // YouTube watch URL
  if (input.includes('youtube.com/watch')) {
    const match = input.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }

  // YouTube short URL
  if (input.includes('youtu.be/')) {
    const match = input.match(/youtu\.be\/([^?]+)/);
    return match ? match[1] : null;
  }

  // YouTube embed
  if (input.includes('youtube.com/embed/')) {
    const match = input.match(/embed\/([^?]+)/);
    return match ? match[1] : null;
  }

  return null;
};

/**
 * Extrai o ID do vídeo do Vimeo de uma URL ou código embed
 */
export const extractVimeoId = (input: string): string | null => {
  if (!input) return null;

  // Vimeo URL ou embed
  const match = input.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
};

/**
 * Busca a duração de um vídeo do YouTube via API do YouTube
 * Retorna duração em minutos (arredondado)
 */
export const fetchYouTubeDuration = async (videoId: string): Promise<number | null> => {
  try {
    // Usar oEmbed endpoint (não requer API key)
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) return null;

    // oEmbed do YouTube não retorna duração
    // A única forma confiável seria usar a API oficial do YouTube Data v3 que requer chave
    // Por enquanto, retornaremos null e o admin terá que inserir manualmente
    return null;
  } catch (error) {
    console.error('Erro ao buscar duração do YouTube:', error);
    return null;
  }
};

/**
 * Busca a duração de um vídeo do Vimeo via API do Vimeo
 * Retorna duração em minutos (arredondado)
 */
export const fetchVimeoDuration = async (videoId: string): Promise<number | null> => {
  try {
    // Vimeo oEmbed endpoint (não requer API key)
    const response = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    // oEmbed do Vimeo retorna duration em segundos
    if (data.duration) {
      const minutes = Math.ceil(data.duration / 60);
      return minutes;
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar duração do Vimeo:', error);
    return null;
  }
};

/**
 * Tenta detectar automaticamente a duração de um vídeo baseado no embed/URL
 * Retorna duração em minutos ou null se não conseguir detectar
 */
export const detectVideoDuration = async (embedCode: string): Promise<number | null> => {
  if (!embedCode) return null;

  // Tenta extrair ID do YouTube
  const youtubeId = extractYouTubeId(embedCode);
  if (youtubeId) {
    const duration = await fetchYouTubeDuration(youtubeId);
    if (duration) return duration;
  }

  // Tenta extrair ID do Vimeo
  const vimeoId = extractVimeoId(embedCode);
  if (vimeoId) {
    const duration = await fetchVimeoDuration(vimeoId);
    if (duration) return duration;
  }

  return null;
};

/**
 * Formata segundos para string de duração (ex: "1h 23min" ou "45min")
 */
export const formatDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`.trim();
  }

  return `${minutes}min`;
};

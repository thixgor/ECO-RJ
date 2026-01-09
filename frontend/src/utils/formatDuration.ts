/**
 * Formata duração em minutos para exibição amigável
 * @param minutes - Duração em minutos
 * @returns String formatada (ex: "45 min", "1h 24min", "2h")
 */
export function formatDuration(minutes: number | undefined | null): string {
  if (!minutes || minutes <= 0) return '';

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Formata duração total para exibição em cards de curso
 * @param minutes - Duração total em minutos
 * @returns String formatada ou string vazia se não houver duração
 */
export function formatTotalDuration(minutes: number | undefined | null): string {
  if (!minutes || minutes <= 0) return '';
  return formatDuration(minutes);
}

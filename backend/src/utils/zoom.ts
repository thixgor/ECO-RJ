/**
 * Utilitários da integração com o Zoom.
 *
 * Duas responsabilidades:
 *  1. Normalizar o Meeting ID que o admin digita — ele costuma colar o link do
 *     convite ("https://us02web.zoom.us/j/12345678901?pwd=...") em vez do número.
 *  2. Impedir que a senha da reunião saia do servidor para quem não deve vê-la.
 *     O aluno não precisa da senha no navegador para entrar pela plataforma: a
 *     rota /api/zoom/signature entrega número + senha apenas a quem tem acesso
 *     à aula, no momento do join.
 */

/** Extrai só os dígitos de um Meeting ID ou de um link de convite do Zoom. */
export function normalizarMeetingId(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  if (!texto) return null;

  // Link de convite: .../j/<id>, .../wc/join/<id>, .../s/<id>, ?confno=<id>
  const doLink = texto.match(/(?:\/(?:j|s|w|wc(?:\/join)?)\/|confno=)(\d{9,11})/i);
  const digitos = doLink ? doLink[1] : texto.replace(/[\s\-.]/g, '');

  return /^\d{9,11}$/.test(digitos) ? digitos : null;
}

const CAMPOS_PRIVADOS_ZOOM = ['zoomMeetingPassword'] as const;

/**
 * Remove os dados sensíveis de uma aula antes de enviá-la ao cliente.
 * Administradores recebem tudo (precisam editar a aula). Para os demais, a
 * senha do Zoom nunca sai; quando a aula está bloqueada para o usuário, o ID
 * da reunião e o vídeo também são removidos (a listagem do curso é pública).
 */
export function ocultarDadosPrivados<T extends Record<string, any>>(
  aula: T,
  usuario: { cargo?: string } | null | undefined,
  opcoes: { bloqueada?: boolean } = {}
): T {
  if (usuario?.cargo === 'Administrador') return aula;

  const copia: Record<string, any> = { ...aula };
  for (const campo of CAMPOS_PRIVADOS_ZOOM) delete copia[campo];
  if (opcoes.bloqueada) {
    delete copia.zoomMeetingId;
    delete copia.embedVideo;
  }
  return copia as T;
}

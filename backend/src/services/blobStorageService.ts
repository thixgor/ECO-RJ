import { IMaterialConteudo } from '../models/Material';

/**
 * Serviço de storage de arquivos dos materiais.
 *
 * VERCEL BLOB APLICADO — arquivos de material são PRIVADOS.
 * -------------------------------------------------------------------------
 * Referências de arquivo (resolvidas por `getSignedUrl`):
 *   - `blobKey`   : pathname de um blob PRIVADO no Vercel Blob. O download é
 *                   liberado por uma URL ASSINADA de curta duração (temporária),
 *                   gerada sob demanda — o link não é reutilizável nem
 *                   compartilhável de forma permanente.
 *   - `arquivoUrl`: URL direta externa (compatível com o modo antigo — imgur,
 *                   Google Drive público, etc.). Usada só quando não há blobKey.
 *
 * Uploads:
 *   - Conteúdos de material (PDF/arquivo) usam Client Upload PRIVADO
 *     (navegador → Blob direto), via `controllers/blobUploadController.ts`.
 *     Contorna o limite de 4.5 MB das funções serverless e mantém o arquivo
 *     protegido.
 *   - Imagens de CAPA usam upload PÚBLICO (aparecem na vitrine para todos).
 *   - `uploadFile` abaixo faz upload pelo servidor (`put`), útil para uploads
 *     programáticos pequenos — sujeito ao limite de 4.5 MB.
 *
 * Requer a env `BLOB_READ_WRITE_TOKEN` (Project → Storage → Blob → Connect).
 */

// Duração da URL assinada de download (curta, por segurança).
const SIGNED_URL_TTL_MS = 10 * 60 * 1000; // 10 minutos

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Extrai o pathname de um blobKey que pode estar salvo como pathname puro
 * (`materiais/123-arquivo.pdf`) ou como URL completa do blob.
 */
function toPathname(blobKey: string): string {
  const key = blobKey.trim();
  if (/^https?:\/\//i.test(key)) {
    try {
      return decodeURIComponent(new URL(key).pathname.replace(/^\/+/, ''));
    } catch {
      return key;
    }
  }
  return key.replace(/^\/+/, '');
}

/**
 * Resolve a URL de download de um conteúdo de arquivo.
 *
 * - Com `blobKey` (blob privado): gera uma URL assinada temporária.
 * - Senão, usa a `arquivoUrl` direta cadastrada pelo admin.
 *
 * Retorna null quando não há arquivo disponível.
 */
export async function getSignedUrl(conteudo: IMaterialConteudo): Promise<string | null> {
  if (conteudo.blobKey && conteudo.blobKey.trim() && isBlobConfigured()) {
    try {
      const pathname = toPathname(conteudo.blobKey);
      const { issueSignedToken, presignUrl } = await import('@vercel/blob');
      const validUntil = Date.now() + SIGNED_URL_TTL_MS;
      const signed = await issueSignedToken({
        pathname,
        operations: ['get'],
        validUntil
      });
      const { presignedUrl } = await presignUrl(signed, {
        operation: 'get',
        pathname,
        access: 'private',
        validUntil
      });
      return presignedUrl;
    } catch (error) {
      console.error('Erro ao gerar URL assinada do Blob:', error);
      // Fallback para URL direta (se houver), para não travar o download.
      if (conteudo.arquivoUrl && conteudo.arquivoUrl.trim()) {
        return conteudo.arquivoUrl.trim();
      }
      return null;
    }
  }
  if (conteudo.arquivoUrl && conteudo.arquivoUrl.trim()) {
    return conteudo.arquivoUrl.trim();
  }
  return null;
}

/**
 * Upload de um arquivo PRIVADO pelo SERVIDOR (put no Vercel Blob).
 *
 * ATENÇÃO: passa pela função serverless, então está sujeito ao limite de
 * 4.5 MB de body da Vercel. Para arquivos grandes, use o Client Upload
 * (navegador → Blob direto) exposto em `controllers/blobUploadController.ts`.
 *
 * Retorna a `blobKey` (pathname) — o download deve usar `getSignedUrl`.
 */
export async function uploadFile(
  fileName: string,
  data: Buffer | Uint8Array,
  contentType?: string
): Promise<{ url: string; blobKey: string }> {
  if (!isBlobConfigured()) {
    throw new Error(
      'Vercel Blob não configurado. Defina BLOB_READ_WRITE_TOKEN ' +
      '(Project → Storage → Blob → Connect).'
    );
  }
  const { put } = await import('@vercel/blob');
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const blob = await put(fileName, buffer, {
    access: 'private',
    addRandomSuffix: true,
    contentType
  });
  return { url: blob.url, blobKey: blob.pathname };
}
